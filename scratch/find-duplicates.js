const fs = require('fs');
const content = fs.readFileSync('src/i18n/locales/pl.json', 'utf8');

// A simple regex-based key duplicate finder for JSON
const lines = content.split('\n');
const keyStack = []; // track the indentation and object path
const seenPaths = new Set();

lines.forEach((line, index) => {
  const match = line.match(/^\s*"([^"]+)"\s*:/);
  if (match) {
    const key = match[1];
    // Determine nesting level based on indentation (every 2 spaces is a level)
    const spaces = line.match(/^\s*/)[0].length;
    const level = spaces / 2;
    
    // Adjust keyStack to match current level
    while (keyStack.length > level) {
      keyStack.pop();
    }
    
    const parentPath = keyStack.join('.');
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    
    if (seenPaths.has(fullPath)) {
      console.log(`Duplicate key found at line ${index + 1}: ${fullPath}`);
    } else {
      seenPaths.add(fullPath);
    }
    
    // If the line opens a new object, push it to stack
    if (line.trim().endsWith('{')) {
      keyStack.push(key);
    }
  } else if (line.trim() === '}' || line.trim() === '},') {
    keyStack.pop();
  }
});

console.log('Duplicate check complete.');
