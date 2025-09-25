const fs = require('fs').promises;
const path = require('path');

class JsonDB {
    constructor(filePath, initialData = []) {
        this.filePath = filePath;
        this.initialData = initialData;
        this._queue = Promise.resolve();
        this._initDB();
    }

    async _initDB() {
        try {
            await fs.access(this.filePath);
        } catch (error) {
            // File doesn't exist, create initial structure
            // Ensure directory exists
            const dir = path.dirname(this.filePath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(this.filePath, JSON.stringify(this.initialData, null, 2));
        }
    }

    async _read() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading JSON file:', error);
            return this.initialData;
        }
    }

    async _writeAtomic(data) {
        const tempFile = this.filePath + '.tmp';
        try {
            await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
            await fs.rename(tempFile, this.filePath);
        } catch (error) {
            // Cleanup temp file if it exists
            try {
                await fs.unlink(tempFile);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    async runExclusive(fn) {
        return this._queue = this._queue.then(fn, fn);
    }

    async read() {
        return this.runExclusive(async () => {
            return await this._read();
        });
    }

    async write(data) {
        return this.runExclusive(async () => {
            await this._writeAtomic(data);
            return data;
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