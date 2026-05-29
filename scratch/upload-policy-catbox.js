const fs = require('fs');
const http = require('https');

const filePath = 'docs/privacy-policy.html';
const fileContent = fs.readFileSync(filePath, 'utf8');

// We will use standard multipart/form-data upload to Catbox.moe
// Catbox API endpoint: https://catbox.moe/user/api.php
// Fields:
// reqtype=fileupload
// fileToUpload=file_data

const boundary = '----CatboxBoundary' + Math.random().toString(36).substring(2);

const postData = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="reqtype"',
  '',
  'fileupload',
  `--${boundary}`,
  `Content-Disposition: form-data; name="fileToUpload"; filename="privacy-policy.html"`,
  'Content-Type: text/html',
  '',
  fileContent,
  `--${boundary}--`,
  ''
].join('\r\n');

const req = http.request('https://catbox.moe/user/api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('UPLOAD_SUCCESS');
    console.log(body.trim());
  });
});

req.on('error', (err) => {
  console.error('UPLOAD_ERROR', err);
});

req.write(postData);
req.end();
