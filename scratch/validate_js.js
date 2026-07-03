const fs = require('fs');
const path = require('path');
const vm = require('vm');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git') return;
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const rootDir = path.join(__dirname, '..');
const jsFiles = walk(rootDir);

let hasError = false;

jsFiles.forEach(jsPath => {
  const content = fs.readFileSync(jsPath, 'utf8');
  try {
    new vm.Script(content, { filename: path.relative(rootDir, jsPath) });
  } catch (err) {
    console.error(`Syntax Error in JS file ${path.relative(rootDir, jsPath)}:`, err.message);
    console.error(err.stack);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log(`Successfully verified all JS files in the repository! Zero syntax errors.`);
}
