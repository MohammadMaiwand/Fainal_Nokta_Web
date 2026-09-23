/**
 * Expand a free-text exam topic into a teacher-style curriculum outline
 * and concrete question blueprints so generated items stay on-topic.
 */

export type TopicBlueprint = {
  subtopic: string;
  focus: string;
  mcq?: {
    stem: string;
    correct: string;
    wrong: [string, string, string];
  };
  trueFalse?: {
    stem: string;
    answer: 'true' | 'false';
  };
  descriptive?: {
    stem: string;
    expected: string;
  };
};

function norm(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200f]/g, '')
    .trim();
}

function detectDomain(topic: string): string {
  const t = norm(topic);
  if (/(databas|دیتابیس|ډیټابیس|قاعدة البيانات|dbms|اس کیو ال|sql)/i.test(t)) return 'database';
  if (/(network|شبکه|شبک|انٹرنټ|اینترنت|internet|tcp|ip)/i.test(t)) return 'network';
  if (/(windows|ویندوز|وینډوز|office|مایکروسافت|microsoft|excel|word)/i.test(t)) return 'windows';
  if (/(program|برنامه|پروګرام|coding|کد نویسی|python|java|algorithm|الگوریتم)/i.test(t)) return 'programming';
  if (/(alphabet|الفبا|حروف|english letter|آوا|صدا)/i.test(t)) return 'alphabet';
  if (/(computer|کمپیوتر|کمپیوټر|حاسوب|hardware|software|سخت افزار|نرم افزار|cpu|رم)/i.test(t)) return 'computer';
  return 'general';
}

function packFor(
  domain: string,
  language: string,
  topicLabel: string
): TopicBlueprint[] {
  const isEn = language === 'en';
  const isPs = language === 'ps';
  const label = topicLabel.trim() || (isEn ? 'the topic' : isPs ? 'موضوع' : 'موضوع');

  if (domain === 'computer') {
    if (isEn) {
      return [
        {
          subtopic: 'Definition of computer',
          focus: 'definition',
          mcq: {
            stem: 'What is a computer?',
            correct: 'An electronic device that receives data, processes it, and produces useful information',
            wrong: [
              'Only a device for playing games',
              'A device that stores paper documents only',
              'A machine that cannot process data'
            ]
          },
          trueFalse: {
            stem: 'A computer can process data and produce information.',
            answer: 'true'
          },
          descriptive: {
            stem: 'Define a computer in one or two sentences.',
            expected: 'A computer is an electronic machine that inputs data, processes it, and outputs information.'
          }
        },
        {
          subtopic: 'Main parts of a computer',
          focus: 'components',
          mcq: {
            stem: 'Which set lists the main parts of a computer system?',
            correct: 'Input devices, processing unit, output devices, and storage',
            wrong: [
              'Only keyboard and mouse',
              'Only monitor and printer',
              'Only speakers and camera'
            ]
          },
          trueFalse: {
            stem: 'CPU is the main processing unit of a computer.',
            answer: 'true'
          },
          descriptive: {
            stem: 'Name four main parts/components of a computer and briefly explain one.',
            expected: 'Input, CPU/processing, output, storage; e.g. CPU processes instructions.'
          }
        },
        {
          subtopic: 'Hardware and software',
          focus: 'hardware_software',
          mcq: {
            stem: 'What is the difference between hardware and software?',
            correct: 'Hardware is physical parts; software is programs and instructions',
            wrong: [
              'Hardware is programs; software is physical parts',
              'Both mean the same thing',
              'Software is only the monitor'
            ]
          },
          trueFalse: {
            stem: 'Software means the physical parts of a computer such as keyboard and CPU.',
            answer: 'false'
          },
          descriptive: {
            stem: 'Explain hardware and software with one example for each.',
            expected: 'Hardware: keyboard/CPU; Software: Windows/Word.'
          }
        },
        {
          subtopic: 'Input and output devices',
          focus: 'io',
          mcq: {
            stem: 'Which device is an input device?',
            correct: 'Keyboard',
            wrong: ['Monitor', 'Printer', 'Speaker']
          },
          trueFalse: {
            stem: 'A printer is an input device.',
            answer: 'false'
          },
          descriptive: {
            stem: 'List two input devices and two output devices.',
            expected: 'Input: keyboard, mouse; Output: monitor, printer.'
          }
        },
        {
          subtopic: 'CPU and memory',
          focus: 'cpu_memory',
          mcq: {
            stem: 'What does CPU stand for?',
            correct: 'Central Processing Unit',
            wrong: [
              'Computer Personal Utility',
              'Central Print Unit',
              'Control Power Utility'
            ]
          },
          trueFalse: {
            stem: 'RAM is temporary memory used while programs are running.',
            answer: 'true'
          },
          descriptive: {
            stem: 'Briefly explain the role of CPU and RAM.',
            expected: 'CPU executes instructions; RAM temporarily holds running data/programs.'
          }
        },
        {
          subtopic: 'Storage devices',
          focus: 'storage',
          mcq: {
            stem: 'Which is a permanent storage device?',
            correct: 'Hard disk / SSD',
            wrong: ['RAM', 'Cache only', 'CPU register only']
          },
          trueFalse: {
            stem: 'Data on RAM remains after the computer is turned off.',
            answer: 'false'
          },
          descriptive: {
            stem: 'What is the difference between RAM and hard disk storage?',
            expected: 'RAM is temporary/volatile; hard disk keeps data permanently until deleted.'
          }
        }
      ];
    }

    if (isPs) {
      return [
        {
          subtopic: 'د کمپیوټر تعریف',
          focus: 'definition',
          mcq: {
            stem: 'کمپیوټر څه شی دی؟',
            correct: 'یوه بریښنایی وسیله چې معلومات اخلي، پروسس کوي او ګټور معلومات ورکوي',
            wrong: ['یوازې د لوبو وسیله', 'یوازې د کاغذ ساتلو ماشین', 'یوه وسیله چې هیڅ پروسس نشي کولی']
          },
          trueFalse: { stem: 'کمپیوټر معلومات پروسس کولی شي.', answer: 'true' },
          descriptive: {
            stem: 'کمپیوټر په یوه یا دوو جملو کې تعریف کړئ.',
            expected: 'کمپیوټر بریښنایی ماشین دی چې ډیټا اخلي، پروسس کوي او معلومات ورکوي.'
          }
        },
        {
          subtopic: 'د کمپیوټر اصلي برخې',
          focus: 'components',
          mcq: {
            stem: 'د کمپیوټر سیسټم اصلي برخې کومې دي؟',
            correct: 'انپټ، پروسس، آوټ‌پټ او ذخیره‌کول',
            wrong: ['یوازې کیبورډ او ماوس', 'یوازې مانیټر او پرنټر', 'یوازې سپیکر او کیمره']
          },
          trueFalse: { stem: 'CPU د کمپیوټر اصلي پروسس کوونکې برخه ده.', answer: 'true' },
          descriptive: {
            stem: 'د کمپیوټر څلور اصلي برخې ونومئ او یوه یې لنډه تشریح کړئ.',
            expected: 'انپټ، CPU، آوټ‌پټ، ذخیره‌کول؛ مثلاً CPU لارښوونې اجرا کوي.'
          }
        },
        {
          subtopic: 'هارډویر او سافټویر',
          focus: 'hardware_software',
          mcq: {
            stem: 'د هارډویر او سافټویر توپیر څه دی؟',
            correct: 'هارډویر فزیکي برخې دي؛ سافټویر پروګرامونه او لارښوونې دي',
            wrong: ['دواړه یو شی دي', 'سافټویر یوازې مانیټر دی', 'هارډویر یوازې پروګرام دی']
          },
          trueFalse: { stem: 'سافټویر د کمپیوټر فزیکي برخې دي لکه کیبورډ.', answer: 'false' },
          descriptive: {
            stem: 'هارډویر او سافټویر د یوه مثال سره تشریح کړئ.',
            expected: 'هارډویر: کیبورډ/CPU؛ سافټویر: وینډوز/ورډ.'
          }
        },
        {
          subtopic: 'انپټ او آوټ‌پټ',
          focus: 'io',
          mcq: {
            stem: 'کومه وسیله انپټ وسیله ده؟',
            correct: 'کیبورډ',
            wrong: ['مانیټر', 'پرنټر', 'سپیکر']
          },
          trueFalse: { stem: 'پرنټر یوه انپټ وسیله ده.', answer: 'false' },
          descriptive: {
            stem: 'دوه انپټ او دوه آوټ‌پټ وسیلې ولیکئ.',
            expected: 'انپټ: کیبورډ، ماوس؛ آوټ‌پټ: مانیټر، پرنټر.'
          }
        },
        {
          subtopic: 'CPU او حافظه',
          focus: 'cpu_memory',
          mcq: {
            stem: 'CPU د څه مخفف دی؟',
            correct: 'Central Processing Unit',
            wrong: ['Computer Personal Utility', 'Central Print Unit', 'Control Power Utility']
          },
          trueFalse: { stem: 'RAM موقتي حافظه ده چې د پروګرامونو د چلېدو پر مهال کارېږي.', answer: 'true' },
          descriptive: {
            stem: 'د CPU او RAM رول لنډ تشریح کړئ.',
            expected: 'CPU لارښوونې اجرا کوي؛ RAM د چلېدونکو پروګرامونو معلومات ساتي.'
          }
        },
        {
          subtopic: 'د ذخیره‌کولو وسایل',
          focus: 'storage',
          mcq: {
            stem: 'کومه وسیله دایمي ذخیره‌کول لري؟',
            correct: 'هارډ ډیسک / SSD',
            wrong: ['RAM', 'یوازې Cache', 'یوازې CPU رجسټر']
          },
          trueFalse: { stem: 'د RAM معلومات د کمپیوټر د بندېدو وروسته پاتې کېږي.', answer: 'false' },
          descriptive: {
            stem: 'د RAM او هارډ ډیسک توپیر څه دی؟',
            expected: 'RAM موقتي ده؛ هارډ ډیسک معلومات دایمي ساتي.'
          }
        }
      ];
    }

    // Dari (default)
    return [
      {
        subtopic: 'تعریف کمپیوتر',
        focus: 'definition',
        mcq: {
          stem: 'کمپیوتر چیست؟',
          correct: 'دستگاه الکترونیکی که داده می‌گیرد، پردازش می‌کند و معلومات مفید می‌دهد',
          wrong: [
            'فقط وسیلهٔ بازی',
            'فقط ماشین نگهداری کاغذ',
            'دستگاهی که هیچ پردازشی انجام نمی‌دهد'
          ]
        },
        trueFalse: {
          stem: 'کمپیوتر می‌تواند داده را پردازش کند و معلومات تولید نماید.',
          answer: 'true'
        },
        descriptive: {
          stem: 'کمپیوتر را در یک یا دو جمله تعریف کنید.',
          expected: 'کمپیوتر ماشین الکترونیکی است که داده را ورودی می‌گیرد، پردازش می‌کند و معلومات خروجی می‌دهد.'
        }
      },
      {
        subtopic: 'اجزای اصلی کمپیوتر',
        focus: 'components',
        mcq: {
          stem: 'اجزای اصلی یک سیستم کمپیوتری کدام‌اند؟',
          correct: 'ورودی، واحد پردازش، خروجی و ذخیره‌سازی',
          wrong: [
            'فقط کیبورد و ماوس',
            'فقط مانیتور و پرنتر',
            'فقط اسپیکر و کامره'
          ]
        },
        trueFalse: {
          stem: 'CPU واحد اصلی پردازش در کمپیوتر است.',
          answer: 'true'
        },
        descriptive: {
          stem: 'چهار جزء اصلی کمپیوتر را نام ببرید و یکی را مختصر توضیح دهید.',
          expected: 'ورودی، CPU، خروجی، ذخیره‌سازی؛ مثلاً CPU دستورات را اجرا می‌کند.'
        }
      },
      {
        subtopic: 'سخت‌افزار و نرم‌افزار',
        focus: 'hardware_software',
        mcq: {
          stem: 'تفاوت سخت‌افزار و نرم‌افزار چیست؟',
          correct: 'سخت‌افزار بخش‌های فیزیکی است؛ نرم‌افزار برنامه‌ها و دستورات است',
          wrong: [
            'هر دو یکی هستند',
            'نرم‌افزار فقط مانیتور است',
            'سخت‌افزار فقط برنامه است'
          ]
        },
        trueFalse: {
          stem: 'نرم‌افزار به معنی بخش‌های فیزیکی مانند کیبورد و CPU است.',
          answer: 'false'
        },
        descriptive: {
          stem: 'سخت‌افزار و نرم‌افزار را با یک مثال برای هر کدام توضیح دهید.',
          expected: 'سخت‌افزار: کیبورد/CPU؛ نرم‌افزار: ویندوز/ورد.'
        }
      },
      {
        subtopic: 'دستگاه‌های ورودی و خروجی',
        focus: 'io',
        mcq: {
          stem: 'کدام وسیله یک دستگاه ورودی است؟',
          correct: 'کیبورد',
          wrong: ['مانیتور', 'پرنتر', 'اسپیکر']
        },
        trueFalse: {
          stem: 'پرنتر یک دستگاه ورودی است.',
          answer: 'false'
        },
        descriptive: {
          stem: 'دو دستگاه ورودی و دو دستگاه خروجی بنویسید.',
          expected: 'ورودی: کیبورد، ماوس؛ خروجی: مانیتور، پرنتر.'
        }
      },
      {
        subtopic: 'CPU و حافظه',
        focus: 'cpu_memory',
        mcq: {
          stem: 'مخفف CPU چیست؟',
          correct: 'Central Processing Unit',
          wrong: ['Computer Personal Utility', 'Central Print Unit', 'Control Power Utility']
        },
        trueFalse: {
          stem: 'RAM حافظهٔ موقتی است که هنگام اجرای برنامه‌ها استفاده می‌شود.',
          answer: 'true'
        },
        descriptive: {
          stem: 'نقش CPU و RAM را مختصر توضیح دهید.',
          expected: 'CPU دستورات را اجرا می‌کند؛ RAM دادهٔ برنامه‌های در حال اجرا را موقتاً نگه می‌دارد.'
        }
      },
      {
        subtopic: 'وسایل ذخیره‌سازی',
        focus: 'storage',
        mcq: {
          stem: 'کدام یک وسیلهٔ ذخیره‌سازی دایمی است؟',
          correct: 'هارد دیسک / SSD',
          wrong: ['RAM', 'فقط Cache', 'فقط رجستر CPU']
        },
        trueFalse: {
          stem: 'معلومات RAM بعد از خاموش شدن کمپیوتر باقی می‌ماند.',
          answer: 'false'
        },
        descriptive: {
          stem: 'تفاوت RAM و هارد دیسک چیست؟',
          expected: 'RAM موقتی/فرّار است؛ هارد دیسک معلومات را دایمی نگه می‌دارد.'
        }
      }
    ];
  }

  if (domain === 'database') {
    if (isEn) {
      return [
        {
          subtopic: 'What is a database',
          focus: 'definition',
          mcq: {
            stem: 'What is a database?',
            correct: 'An organized collection of related data',
            wrong: [
              'Only a single Word file',
              'A random set of pictures',
              'A computer monitor'
            ]
          },
          trueFalse: { stem: 'A database stores related data in an organized way.', answer: 'true' },
          descriptive: {
            stem: 'Define a database.',
            expected: 'A database is an organized collection of related data.'
          }
        },
        {
          subtopic: 'What is DBMS',
          focus: 'dbms',
          mcq: {
            stem: 'What is a DBMS?',
            correct: 'Software that creates, manages, and controls access to databases',
            wrong: [
              'A type of printer',
              'Only the computer case',
              'A keyboard layout'
            ]
          },
          trueFalse: { stem: 'DBMS stands for Database Management System.', answer: 'true' },
          descriptive: {
            stem: 'What does DBMS mean and what is its main job?',
            expected: 'Database Management System; it manages create/read/update/delete of data safely.'
          }
        },
        {
          subtopic: 'Table, field, record',
          focus: 'table',
          mcq: {
            stem: 'In a database table, a row usually represents a:',
            correct: 'Record',
            wrong: ['Field only', 'Database file name', 'DBMS license']
          },
          trueFalse: { stem: 'A field is a column that stores one type of data.', answer: 'true' },
          descriptive: {
            stem: 'Explain table, field, and record with a short example.',
            expected: 'Table: Students; Field: Name; Record: one student’s full row.'
          }
        },
        {
          subtopic: 'Primary key',
          focus: 'primary_key',
          mcq: {
            stem: 'What is a primary key used for?',
            correct: 'To uniquely identify each record in a table',
            wrong: [
              'To delete the whole database',
              'To change monitor color',
              'To install Windows'
            ]
          },
          trueFalse: { stem: 'A primary key value should be unique for each record.', answer: 'true' },
          descriptive: {
            stem: 'Why do we need a primary key in a table?',
            expected: 'To uniquely identify each record and avoid duplicate identity.'
          }
        },
        {
          subtopic: 'Advantages of DBMS',
          focus: 'advantages',
          mcq: {
            stem: 'Which is an advantage of using a DBMS?',
            correct: 'Better data organization, security, and less redundancy',
            wrong: [
              'It removes the need for any computer',
              'It makes data always unorganized',
              'It prevents saving any data'
            ]
          },
          trueFalse: { stem: 'DBMS can help reduce data redundancy.', answer: 'true' },
          descriptive: {
            stem: 'Write two advantages of DBMS.',
            expected: 'Security/control of access; less duplication; easier update and search.'
          }
        }
      ];
    }

    if (isPs) {
      return [
        {
          subtopic: 'ډیټابیس څه شی دی',
          focus: 'definition',
          mcq: {
            stem: 'ډیټابیس څه شی دی؟',
            correct: 'د اړوندو معلوماتو منظم ټولګه',
            wrong: ['یوازې یو ورډ فایل', 'بې‌نظمه انځورونه', 'یوازې مانیټر']
          },
          trueFalse: { stem: 'ډیټابیس اړوند معلومات په منظم ډول ساتي.', answer: 'true' },
          descriptive: { stem: 'ډیټابیس تعریف کړئ.', expected: 'ډیټابیس د اړوندو معلوماتو منظمه ټولګه ده.' }
        },
        {
          subtopic: 'DBMS څه شی دی',
          focus: 'dbms',
          mcq: {
            stem: 'DBMS څه شی دی؟',
            correct: 'هغه سافټویر چې ډیټابیس جوړوي، مدیریت کوي او لاسرسی کنټرولوي',
            wrong: ['یو ډول پرنټر', 'یوازې کمپیوټر کیس', 'د کیبورډ ترتیب']
          },
          trueFalse: { stem: 'DBMS د Database Management System مخفف دی.', answer: 'true' },
          descriptive: {
            stem: 'DBMS څه معنی لري او اصلي دنده یې څه ده؟',
            expected: 'د ډیټابیس مدیریت سیسټم؛ معلومات په خوندي ډول جوړوي، لوستل/بدلون/حذف کوي.'
          }
        },
        {
          subtopic: 'جدول، فیلډ، ریکارډ',
          focus: 'table',
          mcq: {
            stem: 'په ډیټابیس جدول کې یوه قطار معمولاً څه ښیي؟',
            correct: 'ریکارډ',
            wrong: ['یوازې فیلډ', 'د فایل نوم', 'د DBMS جواز']
          },
          trueFalse: { stem: 'فیلډ یوه ستون ده چې یو ډول معلومات ساتي.', answer: 'true' },
          descriptive: {
            stem: 'جدول، فیلډ او ریکارډ د مثال سره تشریح کړئ.',
            expected: 'جدول: زده‌کوونکي؛ فیلډ: نوم؛ ریکارډ: د یوه زده‌کوونکي بشپړ قطار.'
          }
        },
        {
          subtopic: 'Primary key',
          focus: 'primary_key',
          mcq: {
            stem: 'Primary key د څه لپاره دی؟',
            correct: 'چې هر ریکارډ په جدول کې په ځانګړي ډول وپېژني',
            wrong: ['چې ټول ډیټابیس ړنګ کړي', 'چې د مانیټر رنګ بدل کړي', 'چې وینډوز نصب کړي']
          },
          trueFalse: { stem: 'د primary key ارزښت باید د هر ریکارډ لپاره ځانګړی وي.', answer: 'true' },
          descriptive: {
            stem: 'ولې په جدول کې primary key ته اړتیا ده؟',
            expected: 'چې هر ریکارډ بې‌تکرار او په روښانه ډول وپېژندل شي.'
          }
        },
        {
          subtopic: 'د DBMS ګټې',
          focus: 'advantages',
          mcq: {
            stem: 'د DBMS یوه ګټه کومه ده؟',
            correct: 'ښه نظم، امنیت او د معلوماتو لږ تکرار',
            wrong: ['کمپیوټر ته اړتیا نه پاتې کېږي', 'معلومات تل بې‌نظمه کېږي', 'هیڅ معلومات نه خوندي کېږي']
          },
          trueFalse: { stem: 'DBMS کولی شي د معلوماتو تکرار کم کړي.', answer: 'true' },
          descriptive: {
            stem: 'د DBMS دوه ګټې ولیکئ.',
            expected: 'امنیت/کنټرول؛ لږ تکرار؛ اسانه لټون او تازه کول.'
          }
        }
      ];
    }

    return [
      {
        subtopic: 'دیتابیس چیست',
        focus: 'definition',
        mcq: {
          stem: 'دیتابیس چیست؟',
          correct: 'مجموعهٔ منظم از معلومات مرتبط',
          wrong: ['فقط یک فایل ورد', 'مجموعهٔ بی‌نظم تصاویر', 'فقط مانیتور کمپیوتر']
        },
        trueFalse: {
          stem: 'دیتابیس معلومات مرتبط را به‌صورت منظم ذخیره می‌کند.',
          answer: 'true'
        },
        descriptive: {
          stem: 'دیتابیس را تعریف کنید.',
          expected: 'دیتابیس مجموعهٔ منظم معلومات مرتبط است.'
        }
      },
      {
        subtopic: 'DBMS چیست',
        focus: 'dbms',
        mcq: {
          stem: 'DBMS چیست؟',
          correct: 'نرم‌افزاری که دیتابیس را ایجاد، مدیریت و کنترل دسترسی می‌کند',
          wrong: ['یک نوع پرنتر', 'فقط کیس کمپیوتر', 'چیدمان کیبورد']
        },
        trueFalse: {
          stem: 'DBMS مخفف Database Management System است.',
          answer: 'true'
        },
        descriptive: {
          stem: 'DBMS چه معنا دارد و وظیفهٔ اصلی آن چیست؟',
          expected: 'سیستم مدیریت دیتابیس؛ ایجاد، خواندن، به‌روزرسانی و حذف امن معلومات.'
        }
      },
      {
        subtopic: 'جدول، فیلد و رکورد',
        focus: 'table',
        mcq: {
          stem: 'در جدول دیتابیس، یک سطر معمولاً نشان‌دهندهٔ چیست؟',
          correct: 'رکورد',
          wrong: ['فقط فیلد', 'نام فایل دیتابیس', 'لایسنس DBMS']
        },
        trueFalse: {
          stem: 'فیلد یک ستون است که یک نوع معلومات را نگه می‌دارد.',
          answer: 'true'
        },
        descriptive: {
          stem: 'جدول، فیلد و رکورد را با مثال کوتاه توضیح دهید.',
          expected: 'جدول: شاگردان؛ فیلد: نام؛ رکورد: تمام معلومات یک شاگرد در یک سطر.'
        }
      },
      {
        subtopic: 'کلید اصلی (Primary Key)',
        focus: 'primary_key',
        mcq: {
          stem: 'کلید اصلی (Primary Key) برای چه استفاده می‌شود؟',
          correct: 'برای شناسایی یکتای هر رکورد در جدول',
          wrong: [
            'برای حذف کل دیتابیس',
            'برای تغییر رنگ مانیتور',
            'برای نصب ویندوز'
          ]
        },
        trueFalse: {
          stem: 'مقدار کلید اصلی باید برای هر رکورد یکتا باشد.',
          answer: 'true'
        },
        descriptive: {
          stem: 'چرا در جدول به کلید اصلی نیاز داریم؟',
          expected: 'تا هر رکورد بدون تکرار و به‌صورت یکتا شناسایی شود.'
        }
      },
      {
        subtopic: 'مزایای DBMS',
        focus: 'advantages',
        mcq: {
          stem: 'کدام مورد از مزایای DBMS است؟',
          correct: 'نظم بهتر معلومات، امنیت بیشتر و کاهش تکرار داده',
          wrong: [
            'دیگر به کمپیوتر نیاز نیست',
            'معلومات همیشه بی‌نظم می‌شود',
            'هیچ معلوماتی ذخیره نمی‌شود'
          ]
        },
        trueFalse: {
          stem: 'DBMS می‌تواند تکرار غیرضروری معلومات را کاهش دهد.',
          answer: 'true'
        },
        descriptive: {
          stem: 'دو مزیت DBMS را بنویسید.',
          expected: 'امنیت و کنترل دسترسی؛ کاهش تکرار؛ جستجو و به‌روزرسانی آسان‌تر.'
        }
      }
    ];
  }

  // Generic pedagogical expansion for any topic
  const generic = isEn
    ? [
      {
        subtopic: `Definition of ${label}`,
        focus: 'definition',
        mcq: {
          stem: `What is the correct definition of “${label}”?`,
          correct: `The standard meaning of ${label} as taught in the lesson`,
          wrong: [
            `Something unrelated to ${label}`,
            `The opposite meaning of ${label}`,
            `A term that has no meaning`
          ]
        },
        trueFalse: {
          stem: `“${label}” has a clear definition in this lesson.`,
          answer: 'true' as const
        },
        descriptive: {
          stem: `Define “${label}” in your own words.`,
          expected: `A clear short definition of ${label}.`
        }
      },
      {
        subtopic: `Main parts / elements of ${label}`,
        focus: 'parts',
        mcq: {
          stem: `Which option correctly lists key parts/elements of “${label}”?`,
          correct: `The main components related to ${label}`,
          wrong: [
            `Items not related to ${label}`,
            `Only one unimportant detail`,
            `A random list with no link to ${label}`
          ]
        },
        trueFalse: {
          stem: `“${label}” can be divided into important parts or types.`,
          answer: 'true' as const
        },
        descriptive: {
          stem: `Name the main parts or types of “${label}” and explain one.`,
          expected: `List main parts/types of ${label} with one short explanation.`
        }
      },
      {
        subtopic: `Purpose / use of ${label}`,
        focus: 'purpose',
        mcq: {
          stem: `What is the main purpose of “${label}”?`,
          correct: `Its primary useful role in practice`,
          wrong: [
            `It has no practical use`,
            `It is only used to confuse students`,
            `It replaces every other subject`
          ]
        },
        trueFalse: {
          stem: `Understanding “${label}” helps students use it correctly.`,
          answer: 'true' as const
        },
        descriptive: {
          stem: `Explain why “${label}” is important and where it is used.`,
          expected: `Importance and one practical use of ${label}.`
        }
      },
      {
        subtopic: `Examples of ${label}`,
        focus: 'examples',
        mcq: {
          stem: `Which is a correct example related to “${label}”?`,
          correct: `A valid classroom example of ${label}`,
          wrong: [
            `An unrelated example`,
            `An incorrect example`,
            `An example from a different topic`
          ]
        },
        trueFalse: {
          stem: `There are practical examples for “${label}” in this unit.`,
          answer: 'true' as const
        },
        descriptive: {
          stem: `Give two clear examples related to “${label}”.`,
          expected: `Two short correct examples of ${label}.`
        }
      },
      {
        subtopic: `Common mistakes about ${label}`,
        focus: 'mistakes',
        mcq: {
          stem: `Which statement about “${label}” is a common mistake?`,
          correct: `A frequent incorrect belief about ${label}`,
          wrong: [
            `The correct definition of ${label}`,
            `A correct use of ${label}`,
            `A standard rule of ${label}`
          ]
        },
        trueFalse: {
          stem: `Students should avoid common misconceptions about “${label}”.`,
          answer: 'true' as const
        },
        descriptive: {
          stem: `Write one common mistake about “${label}” and the correct idea.`,
          expected: `One misconception and the correct explanation for ${label}.`
        }
      }
    ]
    : isPs
      ? [
        {
          subtopic: `د ${label} تعریف`,
          focus: 'definition',
          mcq: {
            stem: `د «${label}» سم تعریف کوم دی؟`,
            correct: `د درس له مخې د ${label} معیاري معنی`,
            wrong: [`له ${label} سره نااړونده خبره`, `د ${label} مخالف معنی`, `یوه بې‌معنې اصطلاح`]
          },
          trueFalse: { stem: `«${label}» په دې درس کې روښانه تعریف لري.`, answer: 'true' as const },
          descriptive: { stem: `«${label}» په خپلو الفاظو تعریف کړئ.`, expected: `د ${label} لنډ سم تعریف.` }
        },
        {
          subtopic: `د ${label} اصلي برخې`,
          focus: 'parts',
          mcq: {
            stem: `د «${label}» اصلي برخې/ډولونه کوم دي؟`,
            correct: `هغه اصلي اجزا چې له ${label} سره تړاو لري`,
            wrong: [`نااړونده توکي`, `یوازې یو بې‌اهمیته تفصیل`, `بې‌اړیکې لېست`]
          },
          trueFalse: { stem: `«${label}» مهمو برخو یا ډولونو ته ویشل کېږي.`, answer: 'true' as const },
          descriptive: {
            stem: `د «${label}» اصلي برخې یا ډولونه ونومئ او یو یې تشریح کړئ.`,
            expected: `اصلي برخې/ډولونه او د یوه لنډه تشریح.`
          }
        },
        {
          subtopic: `د ${label} هدف/کارول`,
          focus: 'purpose',
          mcq: {
            stem: `د «${label}» اصلي هدف څه دی؟`,
            correct: `په عمل کې یې اصلي ګټور رول`,
            wrong: [`هیڅ عملي استفاده نلري`, `یوازې د زده‌کوونکو د مغشوشولو لپاره دی`, `هر بل مضمون ځای نیسي`]
          },
          trueFalse: { stem: `د «${label}» پوهېدل مرسته کوي چې سم یې وکاروو.`, answer: 'true' as const },
          descriptive: {
            stem: `ولې «${label}» مهم دی او چیرې کارېږي؟`,
            expected: `اهمیت او یوه عملي استفاده.`
          }
        },
        {
          subtopic: `د ${label} مثالونه`,
          focus: 'examples',
          mcq: {
            stem: `کوم یو د «${label}» سم مثال دی؟`,
            correct: `د ${label} سم درسي مثال`,
            wrong: [`نااړونده مثال`, `غلط مثال`, `د بل موضوع مثال`]
          },
          trueFalse: { stem: `د «${label}» لپاره عملي مثالونه شته.`, answer: 'true' as const },
          descriptive: { stem: `د «${label}» دوه روښانه مثالونه ورکړئ.`, expected: `دوه سم مثالونه.` }
        },
        {
          subtopic: `د ${label} عامې تېروتنې`,
          focus: 'mistakes',
          mcq: {
            stem: `د «${label}» په اړه کومه خبره عامه تېروتنه ده؟`,
            correct: `د ${label} په اړه عامه غلط فهمي`,
            wrong: [`د ${label} سم تعریف`, `د ${label} سم استعمال`, `د ${label} معیاري قانون`]
          },
          trueFalse: { stem: `زده‌کوونکي باید د «${label}» غلط فهمۍ څخه ډډه وکړي.`, answer: 'true' as const },
          descriptive: {
            stem: `د «${label}» یوه عامه تېروتنه او سمه خبره ولیکئ.`,
            expected: `یوه غلط فهمي او سمه تشریح.`
          }
        }
      ]
      : [
        {
          subtopic: `تعریف ${label}`,
          focus: 'definition',
          mcq: {
            stem: `تعریف درست «${label}» کدام است؟`,
            correct: `معنای استاندارد ${label} طبق درس`,
            wrong: [
              `چیزی بی‌ربط به ${label}`,
              `معنای مخالف ${label}`,
              `اصطلاحی بدون معنا`
            ]
          },
          trueFalse: {
            stem: `«${label}» در این درس تعریف روشن دارد.`,
            answer: 'true' as const
          },
          descriptive: {
            stem: `«${label}» را با کلمات خود تعریف کنید.`,
            expected: `تعریف کوتاه و درست از ${label}.`
          }
        },
        {
          subtopic: `اجزای اصلی ${label}`,
          focus: 'parts',
          mcq: {
            stem: `کدام گزینه اجزا/انواع اصلی «${label}» را درست نشان می‌دهد؟`,
            correct: `اجزای اصلی مرتبط با ${label}`,
            wrong: [
              `موارد نامرتبط`,
              `فقط یک جزئیات کم‌اهمیت`,
              `فهرست تصادفی بدون ارتباط`
            ]
          },
          trueFalse: {
            stem: `«${label}» به بخش‌ها یا انواع مهم تقسیم می‌شود.`,
            answer: 'true' as const
          },
          descriptive: {
            stem: `اجزای اصلی یا انواع «${label}» را نام ببرید و یکی را توضیح دهید.`,
            expected: `فهرست اجزا/انواع و توضیح کوتاه یکی از آن‌ها.`
          }
        },
        {
          subtopic: `هدف و کاربرد ${label}`,
          focus: 'purpose',
          mcq: {
            stem: `هدف اصلی «${label}» چیست؟`,
            correct: `نقش مفید و اصلی آن در عمل`,
            wrong: [
              `هیچ کاربرد عملی ندارد`,
              `فقط برای گیج کردن شاگردان است`,
              `جای همه مضامین دیگر را می‌گیرد`
            ]
          },
          trueFalse: {
            stem: `فهمیدن «${label}» کمک می‌کند آن را درست استفاده کنیم.`,
            answer: 'true' as const
          },
          descriptive: {
            stem: `چرا «${label}» مهم است و کجا استفاده می‌شود؟`,
            expected: `اهمیت و یک کاربرد عملی از ${label}.`
          }
        },
        {
          subtopic: `مثال‌های ${label}`,
          focus: 'examples',
          mcq: {
            stem: `کدام یک مثال درست مرتبط با «${label}» است؟`,
            correct: `مثال درسی معتبر از ${label}`,
            wrong: [
              `مثال نامرتبط`,
              `مثال نادرست`,
              `مثال از موضوع دیگر`
            ]
          },
          trueFalse: {
            stem: `برای «${label}» مثال‌های عملی وجود دارد.`,
            answer: 'true' as const
          },
          descriptive: {
            stem: `دو مثال روشن دربارهٔ «${label}» بنویسید.`,
            expected: `دو مثال کوتاه و درست.`
          }
        },
        {
          subtopic: `اشتباهات رایج دربارهٔ ${label}`,
          focus: 'mistakes',
          mcq: {
            stem: `کدام مورد اشتباه رایج دربارهٔ «${label}» است؟`,
            correct: `یک باور نادرست رایج دربارهٔ ${label}`,
            wrong: [
              `تعریف درست ${label}`,
              `کاربرد درست ${label}`,
              `قاعدهٔ استاندارد ${label}`
            ]
          },
          trueFalse: {
            stem: `شاگردان باید از اشتباهات رایج دربارهٔ «${label}» پرهیز کنند.`,
            answer: 'true' as const
          },
          descriptive: {
            stem: `یک اشتباه رایج دربارهٔ «${label}» و شکل درست آن را بنویسید.`,
            expected: `یک سوءبرداشت و توضیح درست.`
          }
        }
      ];

  return generic as TopicBlueprint[];
}

export function expandTopicCurriculum(topic: string, language: string): {
  domain: string;
  outline: string[];
  blueprints: TopicBlueprint[];
} {
  const cleaned = String(topic || '').trim() || (language === 'en' ? 'lesson topic' : 'موضوع درس');
  const domain = detectDomain(cleaned);
  const blueprints = packFor(domain, language, cleaned);
  return {
    domain,
    outline: blueprints.map((b) => b.subtopic),
    blueprints
  };
}
