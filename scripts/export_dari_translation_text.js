const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const sourceDocx = path.join(root, 'Monograph', 'Last_Mono_Expanded_Dari.docx');
const outputPath = path.join(root, 'Monograph', 'ترجمه_شده', 'Dari');

function decodeXml(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractParagraphs(documentXml) {
  return [...documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((match) => match[0])
    .map((paragraphXml) => {
      const text = [...paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((textMatch) => textMatch[1])
        .join('');
      return decodeXml(text).trim();
    })
    .filter(Boolean);
}

function isMajorHeading(line) {
  if (/^فصل\s/.test(line) || /^منابع$/.test(line) || /^ضمیمه\s/.test(line)) {
    return true;
  }

  return [
    'چکیده',
    'فهرست مطالب',
    'فهرست شکل‌ها',
    'فهرست جدول‌ها',
    'فصل اول: معرفی',
    'فصل دوم: مرور ادبیات و کارهای مرتبط',
    'فصل سوم: میتودولوژی و تحلیل نیازمندی‌ها',
    'فصل چهارم: طراحی، پیاده‌سازی و تست سیستم',
    'فصل پنجم: نتایج، بحث و ارزیابی',
    'فصل ششم: نتیجه‌گیری، پیشنهادها و کارهای آینده',
    'منابع',
    'ضمیمه الف: پرسشنامه',
    'ضمیمه ب: نقشه citation برای Mendeley و APA',
  ].includes(line);
}

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const zip = await JSZip.loadAsync(fs.readFileSync(sourceDocx));
  const xml = await zip.file('word/document.xml').async('string');
  const lines = extractParagraphs(xml);

  const out = [];
  out.push('ترجمه کامل دری مونوگراف');
  out.push('منبع: مونوگراف انگلیسی سیستم مدیریت اکادمی نکته');
  out.push('یادداشت: متن به زبان دری و به شکل خط‌به‌خط برای خوانایی بهتر تنظیم شده است.');
  out.push('');

  let number = 1;
  for (const line of lines) {
    if (isMajorHeading(line)) {
      out.push('');
      out.push(line);
      out.push('='.repeat(Math.min(line.length, 80)));
      number = 1;
      continue;
    }

    out.push(`${String(number).padStart(3, '0')}. ${line}`);
    number += 1;
  }

  fs.writeFileSync(outputPath, `\uFEFF${out.join('\r\n')}\r\n`, 'utf8');
  console.log(`Wrote ${lines.length} extracted Dari lines to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
