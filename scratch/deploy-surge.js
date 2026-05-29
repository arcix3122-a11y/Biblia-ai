const { spawn } = require('child_process');

console.log('Starting Surge deployment to biblia-asystent-privacy.surge.sh...');

// We spawn npx surge ./docs biblia-asystent-privacy.surge.sh
const child = spawn('npx', ['surge', './docs', 'biblia-asystent-privacy.surge.sh'], {
  shell: true
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // If surge asks for email
  if (output.toLowerCase().includes('email:')) {
    console.log('\n[Automation] Writing email...');
    child.stdin.write('smartnajeminfo@gmail.com\n');
  }

  // If surge asks for password
  if (output.toLowerCase().includes('password:')) {
    console.log('\n[Automation] Writing password...');
    child.stdin.write('BibliaAi2026Secure!\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`\nSurge process exited with code ${code}`);
});
