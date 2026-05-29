const fs = require('fs');
const path = require('path');

const plPath = path.join(__dirname, '../src/i18n/locales/pl.json');
const enPath = path.join(__dirname, '../src/i18n/locales/en.json');

const plText = fs.readFileSync(plPath, 'utf8');
const enText = fs.readFileSync(enPath, 'utf8');

const ALLOWED_CHARS = /^[a-zA-Z0-9\s.,\/\\'"?:!@#\$%\^&\*\(\)_\+\-=\[\]\{\};:<>➔→…‘’„”—🌟\n\r\tęóąśłżźćńĘÓĄŚŁŻŹĆŃ]*$/;

console.log('--- PL.JSON SCAN ---');
let plClean = true;
for (let i = 0; i < plText.length; i++) {
  const char = plText[i];
  if (!ALLOWED_CHARS.test(char)) {
    console.log(`Corrupt char at index ${i}: '${char}' (code: ${char.charCodeAt(0).toString(16)})`);
    plClean = false;
  }
}
if (plClean) console.log('pl.json is 100% clean of mojibake!');

console.log('--- EN.JSON SCAN ---');
let enClean = true;
for (let i = 0; i < enText.length; i++) {
  const char = enText[i];
  if (!ALLOWED_CHARS.test(char)) {
    console.log(`Corrupt char at index ${i}: '${char}' (code: ${char.charCodeAt(0).toString(16)})`);
    enClean = false;
  }
}
if (enClean) console.log('en.json is 100% clean of mojibake!');

