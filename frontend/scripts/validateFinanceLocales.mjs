/**
 * Executable finance localization parity check (en/fa/ps).
 * Fails if payments or finance namespaces diverge, or if English still contains Dari/Arabic script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'src', 'locales', 'messages');
const langs = ['en', 'fa', 'ps'];
const namespaces = ['payments', 'finance'];
const dari = /[\u0600-\u06FF]/;
const failures = [];

for (const ns of namespaces) {
  const maps = {};
  for (const lang of langs) {
    maps[lang] = JSON.parse(fs.readFileSync(path.join(root, lang, `${ns}.json`), 'utf8'));
  }
  const allKeys = new Set([...Object.keys(maps.en), ...Object.keys(maps.fa), ...Object.keys(maps.ps)]);
  for (const key of allKeys) {
    for (const lang of langs) {
      if (!(key in maps[lang])) {
        failures.push(`${ns}: missing key "${key}" in ${lang}`);
      }
    }
  }
  for (const [key, value] of Object.entries(maps.en)) {
    if (dari.test(String(value))) {
      failures.push(`${ns}: English value still contains Dari/Arabic script for key "${key}"`);
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      namespaces,
      paymentsKeys: Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'en', 'payments.json'), 'utf8'))).length,
      financeKeys: Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'en', 'finance.json'), 'utf8'))).length
    },
    null,
    2
  )
);
