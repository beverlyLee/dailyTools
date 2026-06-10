import { createServer } from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;

console.log('Step 1: Check if node works...');
console.log('Node version:', process.version);

console.log('\nStep 2: Starting vite server...');

const vite = spawn('npx', ['vite', '--port', '3007'], {
  cwd: projectDir,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false
});

let viteOutput = '';
let serverReady = false;

vite.stdout.on('data', (data) => {
  const text = data.toString();
  viteOutput += text;
  console.log('[Vite stdout]:', text.trim());
  if (text.includes('Local:') && !serverReady) {
    serverReady = true;
    console.log('\n✅ Vite server is ready!');
  }
});

vite.stderr.on('data', (data) => {
  console.error('[Vite stderr]:', data.toString().trim());
});

vite.on('exit', (code, signal) => {
  console.log(`Vite exited with code ${code}, signal ${signal}`);
  console.log('Full output:', viteOutput);
  process.exit(0);
});

vite.on('error', (err) => {
  console.error('Vite error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  if (!serverReady) {
    console.log('⏳ Still waiting for server after 10s...');
    console.log('Output so far:', viteOutput);
  }
}, 10000);

setTimeout(() => {
  console.log('\n⏱️  20s timeout - stopping test');
  console.log('Server ready:', serverReady);
  vite.kill();
}, 20000);
