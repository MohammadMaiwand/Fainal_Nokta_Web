# ERD استاندارد دیتابیس Nokta Academy

## خروجی‌ها

| فایل | کاربرد |
|---|---|
| `ERD Database.png` | تصویر کامل Chen ERD؛ خروجی اصلی موردنظر برای مشاهده/چاپ در ابعاد بزرگ |
| `ERD Database Chen.svg` | نسخهٔ برداری Chen ERD؛ برای زوم بدون افت کیفیت یا ویرایش |
| `ERD Database.svg` | تصویر ERD با ۵۴ collection، کلیدها و تمام referenceهای تعریف‌شده در مدل‌ها |
| `ERD Database.mmd` | منبع Mermaid قابل import در Mermaid Live، draw.io و ابزارهای سازگار |
| `schema-catalog.json` | کاتالوگ ساخت‌یافتهٔ collectionها، business keyها و referenceها |
| `generate-erd.mjs` | تولیدکنندهٔ خروجی‌ها؛ پس از تغییر مدل‌ها اجرا شود: `node ERD/generate-erd.mjs` |

## فناوری و قواعد مدل‌سازی

- موتور داده: **MongoDB**؛ لایهٔ مدل: **Mongoose 7**.
- PK تمام collectionها: `_id: ObjectId`.
- `→` یعنی reference از فیلد سمت چپ به collection/model سمت راست.
- `?` یعنی مقدار `null` یا اختیاری است؛ نبود `?` یعنی `required: true` در schema.
- `[]` یعنی آرایهٔ ObjectId و رابطهٔ چندبه‌چندِ مدیریت‌شده توسط برنامه.
- `UQ` یعنی unique index یا unique constraint سطح Mongoose.
- schemaهای ساخته‌شده با `createBaseSchema` به‌صورت مشترک `createdAt`، `updatedAt`، `isDeleted` و `deletedBy? → User` دارند؛ برای خوانایی در همهٔ کارت‌ها تکرار نشده‌اند.

## علائم Chen در تصویر اصلی

- مستطیل سبز: entity / collection.
- بیضی صورتی: attribute معمولی.
- بیضی نارنجیِ زیرخط‌دار: primary key یا business key یکتا.
- بیضی آبی: attribute ارجاعی (`ObjectId ref`).
- لوزی آبی: relationship.
- رابطه‌های پایین تصویر، فهرست خوانای همهٔ ۱۰۰ reference هستند؛ در هر ردیف نام موجودیت مبدأ، لوزی `references`، موجودیت مقصد و نام field/کاردینالیتی آمده است.

MongoDB کلید خارجی، cascade و referential-integrity اجباری ندارد. بنابراین خطوط و referenceهای این ERD قرارداد سطح برنامه هستند، نه FK enforce‌شده توسط database. عملیات حذف و یکپارچگی باید در serviceها کنترل شود.

## دامنه‌های نمودار

| دامنه | collectionهای اصلی | هدف |
|---|---|---|
| Identity & organization | User, Branch, Owner, Teacher, Parent, Student, Family | هویت، نقش‌ها، پروفایل‌ها و ساختار شعبه |
| Academic delivery | Class, Subject, Course, Enrollment, Timetable, Attendance | آموزش، ثبت‌نام، زمان‌بندی و حضور |
| Assessment & AI | Exam, Question, Result, ExamResult و Enterprise* | ارزیابی، نمره و تحلیل هوش مصنوعی |
| Finance & payroll | Payment, Salary*, Expense, FinanceEntry, Tax* | دریافت، پرداخت، حقوق و مالیات |
| Communication & operations | Message, Notification, Announcement, Report | پیام‌رسانی و عملیات اجرایی |

## روابط مهم و کاردینالیتی

کاردینالیتی inverse برای referenceهای scalar به‌طور معمول `Parent 1 — 0..N Child` است؛ اگر `UQ` روی FK وجود داشته باشد، رابطه `0..1 — 1` است.

1. **پروفایل‌ها:** `Teacher.userId`، `Parent.userId` و `Owner.userId` همگی unique و required هستند؛ هر کدام با `User` رابطهٔ یک‌به‌یک دارند.
2. **دانش‌آموز:** `Student` به `Class`، `Subject`، `User` (teacher)، و `Family` اجباری وصل است. `Enrollment` رکورد واسط ثبت‌نام است و unique composite آن از ثبت‌نام تکراری جلوگیری می‌کند.
3. **خانواده:** `FamilyLink` رابطهٔ استاندارد واسط `Parent ↔ Student` را با unique `(parentId, studentId)` نگه می‌دارد. آرایه‌های `Family.students` و `Parent.linkedStudentIds` نسخه‌های denormalized همین رابطه‌اند.
4. **دروس و تخصیص‌ها:** آرایه‌های `assignedSubjects`/`assignedClasses` در User، Teacher و Class روابط M:N را در document ذخیره می‌کنند؛ جدول junction فیزیکی ندارند.
5. **ارزیابی:** `Exam → Class, Subject, User`؛ `Question → Exam`؛ `Result → User` و `ExamResult → Student` هستند. این تفاوت عمدی/موجود در schema است و نباید دو مدل را معادل فرض کرد.
6. **حضور:** Attendance هم می‌تواند به `Student` و هم به `User` متصل شود و برای یک session به Timetable، Subject و AttendancePolicy ارجاع دارد.
7. **مالی:** Payment با Student، Enrollment، Class، Subject، Teacher و SalaryRecordها قابل اتصال است؛ SalaryTransaction نیز زنجیرهٔ Student/Class/Subject/Course/Payment را به حقوق مدرس پیوند می‌دهد.
8. **پیام‌ها:** Message دارای self-referenceهای `parentMessageId` و `threadId` است؛ این دو برای reply و thread استفاده می‌شوند.

## مواردی که نیازمند دقت هستند

- `Result.student`، `AIResultInsight.studentId`، `StudentMessage.studentId` و `StationerySale.studentId` به **User** reference می‌دهند، نه `Student`.
- Role و Permission کاتالوگ‌اند؛ `User.role` یک string enum است و FK به Role ندارد. Permissionها هم در `permissionKeys`/Map نگه‌داری می‌شوند.
- `Payment.salaryRecordIds` و Notification recipient/read arrays آرایهٔ reference هستند؛ MongoDB uniqueness یا سازگاری دوطرفهٔ آن‌ها را تضمین نمی‌کند.
- موجودیت‌های Enterprise در `backend/src/modules/enterprise/enterprise.models.ts` تعریف شده‌اند، نه پوشهٔ اصلی models.

## مبنای صحت

این مستند از فایل‌های `backend/src/models/*.ts` و `backend/src/modules/enterprise/enterprise.models.ts` استخراج شده است. `ERD Database.svg` برای خواندن کامل در مرورگر یا ابزار SVG باز شود؛ اندازهٔ بزرگ آن برای جلوگیری از فشرده‌شدن ۵۴ collection عمدی است.
