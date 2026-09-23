import fs from 'node:fs';
import path from 'node:path';

const faDir = path.resolve('src/locales/messages/fa');

const replacements = [
  [/کل کلاس‌ها/g, 'کل صنف‌ها'],
  [/کد کلاس/g, 'کود صنف'],
  [/کد صنف/g, 'کود صنف'],
  [/نام کلاس/g, 'نام صنف'],
  [/": "کلاس"/g, '": "صنف"'],
  [/": "کد"/g, '": "کود"'],
  [/معلمان/g, 'استادان'],
  [/معلمی/g, 'استادی'],
  [/معلم/g, 'استاد'],
  [/محصلین/g, 'شاگردان'],
  [/تیلفون/g, 'تلفن'],
  [/عدد یا کد/g, 'عدد یا کود'],
  [/شاگرد و معلم/g, 'شاگرد و استاد'],
  [/داشبورد معلم/g, 'داشبورد استاد'],
  [/همه نمایندگی‌ها/g, 'همه شعبه‌ها'],
  [/مدیریت نمایندگی‌ها/g, 'مدیریت شعبات'],
  [/نمایندگی‌ها/g, 'شعبات'],
  [/مدیر نمایندگی/g, 'مدیر شعبه'],
  [/نمایندگی/g, 'شعبه'],
  [/": "ISBN"/g, '": "شابک"'],
  [/داشبورد/g, 'نمای مدیریتی']
];

for (const file of fs.readdirSync(faDir).filter((name) => name.endsWith('.json'))) {
  const filePath = path.join(faDir, file);
  let text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value);
  }
  fs.writeFileSync(filePath, `${text.trimEnd()}\n`, 'utf8');
}

console.log('Normalized Dari (fa) locale files.');
