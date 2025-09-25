const fs = require('fs').promises;
const path = require('path');

class JsonDB {
    constructor(filePath) {
        this.filePath = filePath;
        this._queue = Promise.resolve();
        this._initDB();
    }

    async _initDB() {
        try {
            await fs.access(this.filePath);
        } catch (error) {
            // File doesn't exist, create initial structure
            const initialData = {
                documents: [],
                assets: [],
                versions: [],
                users: []
            };
            await this._writeAtomic(initialData);
        }
    }

    async _read() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { documents: [], assets: [], versions: [], users: [] };
            }
            throw error;
        }
    }

    async _writeAtomic(data) {
        const tempPath = this.filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempPath, this.filePath);
    }

    // Serialize all database operations to prevent race conditions
    runExclusive(operation) {
        this._queue = this._queue.then(() => operation());
        return this._queue;
    }

    async getState() {
        return this.runExclusive(async () => {
            return await this._read();
        });
    }

    async updateState(mutator) {
        return this.runExclusive(async () => {
            const state = await this._read();
            const result = await mutator(state);
            await this._writeAtomic(state);
            return result;
        });
    }
}

module.exports = JsonDB;