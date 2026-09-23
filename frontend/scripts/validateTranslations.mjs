import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/locales/messages');
const languages = ['en', 'fa', 'ps'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function flattenKeys(value, prefix = '') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key));
}

const namespaces = fs
  .readdirSync(path.join(root, 'en'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace('.json', ''));

const failures = [];
const warnings = [];
const reference = {};

for (const namespace of namespaces) {
  reference[namespace] = flattenKeys(readJson(path.join(root, 'en', `${namespace}.json`))).sort();
}

for (const language of languages.slice(1)) {
  for (const namespace of namespaces) {
    const filePath = path.join(root, language, `${namespace}.json`);
    if (!fs.existsSync(filePath)) {
      failures.push(`${language}/${namespace}.json is missing`);
      continue;
    }

    const keys = flattenKeys(readJson(filePath)).sort();
    const missing = reference[namespace].filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !reference[namespace].includes(key));

    if (missing.length) {
      failures.push(`${language}/${namespace}.json missing keys: ${missing.join(', ')}`);
    }
    if (extra.length) {
      warnings.push(`${language}/${namespace}.json extra keys: ${extra.join(', ')}`);
    }
  }
}

if (warnings.length) {
  failures.push(...warnings.map((item) => `extra translation keys: ${item}`));
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures, warnings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, namespaces, languages }, null, 2));
}
