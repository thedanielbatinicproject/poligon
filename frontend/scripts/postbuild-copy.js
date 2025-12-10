const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'dist');
const dest = path.resolve(__dirname, '..', '..', 'backend', 'public');

// LaTeX autocomplete data source and destination
const latexDataSrc = path.resolve(__dirname, '..', 'src', 'components', 'latex-autocomplete-data');
const latexDataDest = path.resolve(dest, 'assets', 'latex-autocomplete-data');

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
  
  // Copy LaTeX autocomplete data JSON files
  if (fs.existsSync(latexDataSrc)) {
    copyRecursive(latexDataSrc, latexDataDest);
    console.log('Copied latex-autocomplete-data ->', latexDataDest);
  } else {
    console.warn('LaTeX autocomplete data not found:', latexDataSrc);
  }
} catch (err) {
  console.error('postbuild copy failed', err);
  process.exit(1);
}
