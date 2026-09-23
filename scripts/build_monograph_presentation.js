const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'Monograph', 'ترجمه_شده', 'SE_Final_Year_Project_Presentation_Template.pptx');
const outputPath = path.join(root, 'Monograph', 'ترجمه_شده', 'Nokta_Academy_Management_System_Presentation_Dari.pptx');

const EMU = 914400;

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphXml(text, { bullet = true, bold = false, size = 2400 } = {}) {
  const bulletXml = bullet ? '<a:buChar char="•"/>' : '<a:buNone/>';
  return `<a:p><a:pPr algn="r" rtl="1">${bulletXml}</a:pPr><a:r><a:rPr lang="fa-IR" sz="${size}" b="${bold ? 1 : 0}" dirty="0"><a:latin typeface="B Nazanin"/><a:ea typeface="B Nazanin"/><a:cs typeface="B Nazanin"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`;
}

function textBodyXml(lines, options = {}) {
  return `<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${lines.map((line) => paragraphXml(line, options)).join('')}</p:txBody>`;
}

function titleBodyXml(title) {
  return `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphXml(title, { bullet: false, bold: true, size: 3200 })}</p:txBody>`;
}

function replaceShapeText(slideXml, title, bodyLines) {
  let shapeIndex = 0;
  return slideXml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (shapeXml) => {
    if (!shapeXml.includes('<p:txBody>')) return shapeXml;
    shapeIndex += 1;
    let replacement = '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>';
    if (shapeIndex === 1) replacement = titleBodyXml(title);
    if (shapeIndex === 2) replacement = textBodyXml(bodyLines);
    return shapeXml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/, replacement);
  });
}

function removeTemplatePlaceholders(slideXml) {
  const placeholders = [
    'Project title ',
    '1',
    'st',
    ' member',
    ' name',
    'Father',
    '’s name',
    '2nd ',
    '3rd ',
    '4th ',
    'Supervisor name',
    'Date',
    'member',
  ];

  let xml = slideXml;
  for (const text of placeholders) {
    xml = xml.replaceAll(`<a:t>${esc(text)}</a:t>`, '<a:t></a:t>');
  }
  return xml;
}

function getRelId(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  return `rId${Math.max(0, ...ids) + 1}`;
}

function addPngContentType(zip) {
  const file = '[Content_Types].xml';
  let xml = zip.file(file).async ? null : null;
  return file;
}

async function ensurePngContentType(zip) {
  const file = '[Content_Types].xml';
  let xml = await zip.file(file).async('string');
  if (!xml.includes('Extension="png"')) {
    xml = xml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
    zip.file(file, xml);
  }
}

function imagePicXml(relId, id, name, xIn, yIn, wIn, hIn) {
  const x = Math.round(xIn * EMU);
  const y = Math.round(yIn * EMU);
  const w = Math.round(wIn * EMU);
  const h = Math.round(hIn * EMU);
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

async function addImageToSlide(zip, slideNumber, imagePath, placement) {
  const slideFile = `ppt/slides/slide${slideNumber}.xml`;
  const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const mediaName = `image_nokta_${slideNumber}.png`;
  const mediaPath = `ppt/media/${mediaName}`;
  zip.file(mediaPath, fs.readFileSync(imagePath));

  let relsXml = zip.file(relsFile)
    ? await zip.file(relsFile).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const relId = getRelId(relsXml);
  relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/></Relationships>`);
  zip.file(relsFile, relsXml);

  let slideXml = await zip.file(slideFile).async('string');
  const picXml = imagePicXml(relId, 700 + slideNumber, placement.name, placement.x, placement.y, placement.w, placement.h);
  slideXml = slideXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
  zip.file(slideFile, slideXml);
}

const slides = [
  {
    title: 'سیستم مدیریت اکادمی نکته',
    body: [
      'محصل اول: محمد میوند عثمانی - نام پدر: محمد زمان',
      'محصل دوم: محمد خالد ساحل - نام پدر: ولی محمد',
      'دیپارتمنت: انجینری نرم‌افزار، پوهنځی کمپیوتر ساینس',
      'استاد رهنما: ________________________________',
      'سال تحصیلی: ۲۰۲۵ | مدت پروژه: دو سمستر',
    ],
  },
  {
    title: 'سیستم مدیریت اکادمی نکته',
    body: [
      'مونوگراف نهایی پروژه فراغت',
      'پلتفرم یکپارچه ویب و موبایل‌محور برای مدیریت آموزشی، اداری و مالی',
      'تکنالوژی‌ها: React.js، Node.js، Express.js، MongoDB',
      'تاریخ دفاع: ________________________________',
    ],
  },
  {
    title: 'سیستم مدیریت اکادمی نکته',
    body: [
      'اللهم صل علی محمد و علی آل محمد',
      'هدف ارائه: تشریح مشکل، راه‌حل، طراحی، پیاده‌سازی، ارزیابی و ارزش پروژه',
      'تمرکز پروژه: دیجیتالی‌سازی کارهای اکادمی نکته و افزایش شفافیت معلومات',
    ],
  },
  {
    title: 'معرفی',
    body: [
      'اکادمی نکته با ثبت‌های دستی، فایل‌های پراکنده و گزارش‌دهی کند روبه‌رو بود.',
      'پروژه NAMS یک سیستم واحد برای شاگردان، استادان، والدین و اداره فراهم می‌کند.',
      'اهمیت پروژه در کاهش خطا، سرعت‌بخشیدن به کارهای اداری و شفافیت مالی است.',
      'ذی‌نفعان اصلی: اداره، استادان، شاگردان، والدین و مدیریت مالی اکادمی.',
    ],
  },
  {
    title: 'بیان مشکل',
    body: [
      'نبود یک دیتابیس مرکزی باعث تکرار معلومات و خطا در ثبت شاگردان می‌شد.',
      'پرداخت فیس، معاش استادان و محاسبه مالیه به شکل جداگانه و زمان‌گیر انجام می‌شد.',
      'گزارش‌های آموزشی و مالی دیر آماده می‌شد و تصمیم‌گیری را دشوار می‌ساخت.',
      'ارتباط میان اداره، استادان، شاگردان و والدین منظم و قابل پیگیری نبود.',
    ],
  },
  {
    title: 'سوالات تحقیق',
    body: [
      'چگونه می‌توان فعالیت‌های آموزشی، اداری و مالی اکادمی را در یک سیستم واحد مدیریت کرد؟',
      'کدام نیازمندی‌های کارکردی و غیرکارکردی برای NAMS ضروری است؟',
      'سیستم چگونه می‌تواند دقت معلومات، شفافیت مالی و سرعت گزارش‌دهی را افزایش دهد؟',
      'کاربران تا چه اندازه سیستم را مفید، آسان و قابل قبول ارزیابی می‌کنند؟',
    ],
  },
  {
    title: 'اهداف تحقیق',
    body: [
      'طراحی و پیاده‌سازی سیستم مدیریت اکادمی نکته با ساختار ویب و موبایل‌محور.',
      'خودکارسازی ثبت‌نام، صنف‌ها، مضامین، حاضری، نمرات، پیام‌ها و اعلان‌ها.',
      'مدیریت پرداخت فیس، معاش استادان، محاسبه مالیه و گزارش‌های مالی.',
      'ایجاد کنترول نقش و صلاحیت برای حفاظت معلومات و مدیریت دسترسی کاربران.',
    ],
  },
  {
    title: 'محدوده پروژه',
    body: [
      'شامل: شاگردان، استادان، صنف‌ها، مضامین، حاضری، امتحانات، پرداخت‌ها و معاشات.',
      'شامل: داشبوردها، اعلان‌ها، پیام‌ها، گزارش‌ها و کنترول صلاحیت‌ها.',
      'پلتفرم هدف: ویب اپلیکیشن React و ساختار آماده برای دسترسی موبایل.',
      'محدودیت: اتصال کامل AI و استقرار عمومی در مقیاس بزرگ برای کار آینده پیشنهاد شده است.',
    ],
  },
  {
    title: 'میتودولوژی',
    body: [
      'روش پروژه ترکیبی از Agile Scrum و مراحل منظم SDLC است.',
      'مراحل اصلی: نیازسنجی، تحلیل، طراحی، پیاده‌سازی، تست، ارزیابی و مستندسازی.',
      'داده‌ها از پرسشنامه، بررسی جریان کاری، تحلیل نقش‌ها و مطالعه پروپوزل جمع‌آوری شد.',
      'از ۱۰۰ ذی‌نفع، ۷۵ پاسخ معتبر انتخاب شد و ۶۴ پاسخ پروژه را تأیید کرد.',
    ],
  },
  {
    title: 'نیازمندی‌های سیستم',
    body: [
      'کارکردی: ثبت شاگرد، مدیریت استاد، صنف، مضمون، حاضری، نمره، پرداخت، معاش و پیام.',
      'کارکردی: گزارش‌گیری مالی، آموزشی و مدیریتی با داشبوردهای نقش‌محور.',
      'غیرکارکردی: امنیت، کارایی، خوانایی، قابلیت نگهداری، چندزبانه بودن و پاسخ‌گویی.',
      'امنیت: JWT، Role-Based Access و Permission Middleware برای محدودسازی دسترسی.',
    ],
  },
  {
    title: 'Use Case Diagram',
    body: [
      'بازیگران اصلی: سوپر ادمین، اداره، استاد، شاگرد و والدین.',
      'تعاملات: ثبت شاگرد، مدیریت صنف، حاضری، نمرات، فیس، معاش، گزارش و پیام.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams_dari', 'use_case_dari.png'), x: 1.0, y: 3.0, w: 11.2, h: 4.0, name: 'Use Case Diagram' },
  },
  {
    title: 'معماری سیستم',
    body: [
      'معماری سیستم لایه‌ای است: رابط کاربر، API، دیتابیس، امنیت و گزارش‌دهی.',
      'Frontend با React.js و Backend با Node.js و Express.js ساخته شده است.',
      'MongoDB و Mongoose برای ذخیره‌سازی و مدل‌سازی داده‌ها استفاده شده‌اند.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams_dari', 'architecture_dari.png'), x: 1.0, y: 3.0, w: 11.2, h: 3.8, name: 'System Architecture' },
  },
  {
    title: 'طراحی دیتابیس',
    body: [
      'موجودیت‌های اصلی: User، Student، TeacherProfile، Class، Subject، Payment و SalaryRecord.',
      'رابطه‌ها با ObjectId references در MongoDB حفظ شده‌اند.',
      'طراحی دیتابیس گزارش‌گیری آموزشی، مالی و مدیریتی را پشتیبانی می‌کند.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams_dari', 'erd_dari.png'), x: 1.0, y: 3.0, w: 11.2, h: 4.0, name: 'Database ERD' },
  },
  {
    title: 'طراحی UI/UX',
    body: [
      'طراحی بر سادگی، خوانایی، چندزبانه بودن و مسیرهای واضح کاربر تمرکز دارد.',
      'داشبوردها نقش‌محور هستند و هر کاربر فقط بخش‌های مربوط به خود را می‌بیند.',
      'کارت‌های داشبورد لینک‌دار شده‌اند تا کاربر مستقیم وارد بخش مورد نیاز شود.',
      'اصول طراحی: consistency، simplicity، responsive layout و دسترسی سریع به عملیات مهم.',
    ],
  },
  {
    title: 'پیاده‌سازی',
    body: [
      'Backend شامل مسیرها، سرویس‌ها، مدل‌ها، middleware امنیتی و APIهای گزارش‌دهی است.',
      'Frontend شامل صفحات مدیریتی، داشبوردها، فورم‌ها، جدول‌ها، چارت‌ها و حالت چندزبانه است.',
      'ماژول‌های کلیدی: شاگردان، استادان، حاضری، امتحانات، پرداخت‌ها، معاشات و پیام‌ها.',
      'ساختار پروژه برای توسعه موبایل و تحلیل‌های آینده هوش مصنوعی آماده شده است.',
    ],
  },
  {
    title: 'تست سیستم',
    body: [
      'تست‌های انجام‌شده: unit، integration، system، validation و user feedback.',
      'بخش‌های مهم مانند login، نقش‌ها، پرداخت، معاش، گزارش و دیتابیس بررسی شدند.',
      'تمرکز تست روی درستی محاسبات مالی، امنیت دسترسی و قابل استفاده بودن رابط کاربری بود.',
      'نتیجه کلی نشان داد که سیستم برای جریان کاری اکادمی قابل استفاده و قابل توسعه است.',
    ],
  },
  {
    title: 'چالش‌ها و راه‌حل‌ها',
    body: [
      'چالش: یکجا کردن معلومات پراکنده آموزشی و مالی. راه‌حل: مدل داده مرکزی و APIهای منظم.',
      'چالش: تفاوت نقش‌ها و صلاحیت‌ها. راه‌حل: Role-Based Access و Permission Keys.',
      'چالش: محاسبه معاش، کمیشن و مالیه. راه‌حل: سرویس Payroll و قواعد محاسبه قابل پیگیری.',
      'چالش: خوانایی برای کاربران مختلف. راه‌حل: داشبورد ساده، زبان دری و طراحی پاسخ‌گو.',
    ],
  },
  {
    title: 'ارزیابی پروژه',
    body: [
      'جامعه هدف ۱۰۰ نفر بود و ۷۵ پاسخ معتبر برای تحلیل انتخاب شد.',
      '۶۴ نفر پروژه را تأیید کردند؛ نرخ پذیرش پروژه ۸۵.۳۳ درصد محاسبه شد.',
      'شاخص‌های ارزیابی: مفید بودن، آسانی استفاده، دقت معلومات و بهبود گزارش‌دهی.',
    ],
    image: { path: path.join(root, 'Monograph', 'diagrams', 'project_acceptance_chart.png'), x: 1.2, y: 3.15, w: 4.8, h: 2.7, name: 'Project Acceptance Chart' },
  },
  {
    title: 'کارهای آینده',
    body: [
      'افزودن AI برای تحلیل عملکرد شاگردان و تشخیص خطر افت تحصیلی.',
      'تکمیل نسخه موبایل برای شاگردان، والدین و استادان.',
      'اتصال سیستم به SMS، WhatsApp یا ایمیل برای اطلاع‌رسانی سریع.',
      'استقرار ابری، backup خودکار، audit logs و گزارش‌های تحلیلی پیشرفته.',
    ],
  },
  {
    title: 'نتیجه‌گیری',
    body: [
      'NAMS یک راه‌حل عملی برای مشکلات واقعی اداری، آموزشی و مالی اکادمی نکته است.',
      'سیستم کارهای دستی را کاهش داده، دقت معلومات و سرعت گزارش‌دهی را افزایش می‌دهد.',
      'کنترول صلاحیت‌ها و ساختار امنیتی باعث حفاظت معلومات حساس کاربران می‌شود.',
      'پروژه یک نمونه قابل توسعه برای تحول دیجیتالی اکادمی‌های خصوصی در افغانستان است.',
    ],
  },
  {
    title: 'منابع',
    body: [
      'Pressman & Maxim (2020), Software Engineering: A Practitioner’s Approach.',
      'Sommerville (2016), Software Engineering.',
      'Bass, Clements & Kazman (2012), Software Architecture in Practice.',
      'Davis (1989), Technology Acceptance Model.',
      'ISO/IEC 25010 (2011) و ISO/IEC/IEEE 29148 (2018).',
      'Aldowah et al. (2019), Romero & Ventura (2020), DeLone & McLean (2003).',
    ],
  },
  {
    title: 'پرسش و پاسخ',
    body: [
      'تشکر از توجه شما',
      'اکنون آماده پاسخ‌گویی به سوالات شما هستیم.',
    ],
  },
];

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  await ensurePngContentType(zip);

  for (let i = 0; i < slides.length; i += 1) {
    const slideNumber = i + 1;
    const slideFile = `ppt/slides/slide${slideNumber}.xml`;
    let xml = await zip.file(slideFile).async('string');
    xml = replaceShapeText(xml, slides[i].title, slides[i].body);
    if (slideNumber === 1) xml = removeTemplatePlaceholders(xml);
    zip.file(slideFile, xml);
  }

  for (let i = 0; i < slides.length; i += 1) {
    if (slides[i].image && fs.existsSync(slides[i].image.path)) {
      await addImageToSlide(zip, i + 1, slides[i].image.path, slides[i].image);
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
