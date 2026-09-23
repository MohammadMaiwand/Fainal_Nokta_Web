import fs from 'node:fs';
import path from 'node:path';

const faDir = path.resolve('src/locales/messages/fa');
const forbidden = [
  { pattern: /تیلفون/g, label: 'تیلفون (use تلفن)' },
  { pattern: /"کلاس"/g, label: 'کلاس (use صنف)' },
  { pattern: /کد کلاس/g, label: 'کد کلاس (use کود صنف)' },
  { pattern: /": "کد"/g, label: 'کد as code label (use کود)' },
  { pattern: /معلم/g, label: 'معلم (use استاد)' },
  { pattern: /داشبورد/g, label: 'داشبورد (use نمای مدیریتی)' }
];

const hits = [];
for (const file of fs.readdirSync(faDir).filter((name) => name.endsWith('.json'))) {
  const text = fs.readFileSync(path.join(faDir, file), 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) {
      hits.push(`${file}: ${rule.label}`);
    }
    rule.pattern.lastIndex = 0;
  }
}

if (hits.length) {
  console.error(JSON.stringify({ ok: false, hits }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, message: 'No forbidden Iranian/English Dari terms in fa locales.' }, null, 2));
}
