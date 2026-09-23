#!/usr/bin/env node
/**
 * MongoDB backup helper for Nokta Academy.
 * Requires `mongodump` on PATH (MongoDB Database Tools).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const backupsDir = path.join(repoRoot, 'backups');

function readMongoUri() {
  const envPath = path.join(repoRoot, 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    return process.env.MONGO_URI ?? 'mongodb://localhost:27017/nokta_academy';
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^MONGO_URI=(.+)$/m);
  return (match?.[1] ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/nokta_academy').trim();
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(backupsDir, `mongo-${timestamp}`);

fs.mkdirSync(backupsDir, { recursive: true });

const uri = readMongoUri();
console.log(`Backing up to: ${outputDir}`);

const child = spawn('mongodump', ['--uri', uri, '--out', outputDir], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Backup completed successfully.');
    return;
  }
  console.error(`mongodump exited with code ${code}. Install MongoDB Database Tools if missing.`);
  process.exit(code ?? 1);
});
