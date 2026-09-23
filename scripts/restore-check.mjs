import fs from 'node:fs';
import path from 'node:path';

const backupDir = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');

function listCandidates(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((name) => path.join(dir, name));
}

function isValidBackup(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;
  const lower = filePath.toLowerCase();
  return lower.endsWith('.archive') || lower.endsWith('.gz') || lower.endsWith('.zip') || lower.endsWith('.json');
}

const candidates = listCandidates(backupDir).filter(isValidBackup);
if (!candidates.length) {
  console.error(JSON.stringify({ ok: false, backupDir, message: 'No backup files found' }));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  backupDir,
  backupFiles: candidates.map((file) => path.basename(file))
}));
