import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/locales/messages');
const namespaces = fs.readdirSync(path.join(root, 'en')).filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function flattenKeys(value, prefix = '') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function getNested(value, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), value);
}

function setNested(value, keyPath, leaf) {
  const keys = keyPath.split('.');
  let cursor = value;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = leaf;
}

function titleFromKey(keyPath) {
  const last = keyPath.split('.').pop() ?? keyPath;
  return last
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function syncMissingKeys(source, target) {
  let added = 0;
  const sourceKeys = flattenKeys(source);
  const targetKeys = new Set(flattenKeys(target));

  for (const keyPath of sourceKeys) {
    if (targetKeys.has(keyPath)) continue;
    const value = getNested(source, keyPath);
    const fallback = typeof value === 'string' ? value : titleFromKey(keyPath);
    setNested(target, keyPath, fallback);
    targetKeys.add(keyPath);
    added += 1;
  }

  return added;
}

let addedEn = 0;
let addedPs = 0;

for (const namespace of namespaces) {
  const enPath = path.join(root, 'en', `${namespace}.json`);
  const faPath = path.join(root, 'fa', `${namespace}.json`);
  const psPath = path.join(root, 'ps', `${namespace}.json`);

  const en = readJson(enPath);
  if (fs.existsSync(faPath)) {
    addedEn += syncMissingKeys(readJson(faPath), en);
    writeJson(enPath, en);
  }

  if (fs.existsSync(psPath)) {
    const ps = readJson(psPath);
    addedPs += syncMissingKeys(en, ps);
    writeJson(psPath, ps);
  }
}

console.log(JSON.stringify({ ok: true, addedEnKeys: addedEn, addedPsKeys: addedPs }, null, 2));
