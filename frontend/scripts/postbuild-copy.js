const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'dist');
const dest = path.resolve(__dirname, '..', '..', 'backend', 'public');

function copyRecursive(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) return;
  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
    for (const file of fs.readdirSync(srcPath)) {
      copyRecursive(path.join(srcPath, file), path.join(destPath, file));
    }
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

try {
  if (!fs.existsSync(src)) {
    console.warn('No frontend dist to copy:', src);
    process.exit(0);
  }
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  copyRecursive(src, dest);
  console.log('Copied frontend/dist ->', dest);
} catch (err) {
  console.error('postbuild copy failed', err);
  process.exit(1);
}
