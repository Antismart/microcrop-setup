#!/usr/bin/env node

// Simple test to verify server can start
const { spawn } = require('child_process');

console.log('Testing server startup...\n');

const server = spawn('node', ['src/server.js'], {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' }
});

let output = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  output += data.toString();
  process.stderr.write(data);
});

// Kill server after 3 seconds
setTimeout(() => {
  server.kill();
  
  if (output.includes('MicroCrop Backend Server Running')) {
    console.log('\n✅ Server started successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Server failed to start');
    process.exit(1);
  }
}, 3000);

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
