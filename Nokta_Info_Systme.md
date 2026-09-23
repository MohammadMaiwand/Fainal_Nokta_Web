# Nokta Academy Management System — معلومات کامل پروژه

**نام فایل:** `Nokta_Info_Systme.md`  
**تاریخ تهیه:** ۶ ژوئن ۲۰۲۶  
**نسخه پروژه:** Nokta V7  
**نوع سیستم:** پلتفرم مدیریت آکادمی / مکتب (Full-Stack)

---

## ۱. خلاصه سیستم

**Nokta Academy Management System** یک سامانه جامع مدیریت آموزشی است که برای آکادمی‌ها و مراکز آموزشی طراحی شده. این پروژه شامل:

- **Backend API** — Node.js + Express + TypeScript + MongoDB
- **Frontend Web** — React 18 + Vite + Tailwind CSS + PWA
- **Mobile App** — Flutter (Android / iOS)
- **PWA موبایل** — نسخه Vite در `Nokta_App/frontend_mobile/`

### قابلیت‌های اصلی

| حوزه | توضیح |
|------|--------|
| مدیریت کاربران و نقش‌ها | RBAC با ۸+ نقش سازمانی |
| اکادمیک | شاگرد، استاد، صنف، مضمون، کورس، برنامه درسی |
| حضور و غیاب | ثبت حضور، سیاست‌ها، جلسات |
| امتحان و نتیجه | امتحان، نمره، انتشار نتیجه، تحلیل AI |
| مالی | پرداخت، فیس، حقوق، مالیات افغانستان، مصارف |
| ارتباطات | پیام، اعلان، تماس عمومی |
| کتابخانه | کتاب، صدور و برگشت کتاب |
| گزارش‌دهی | گزارش‌های مالی، تحلیلی و آکادمی |
| چندزبانگی | انگلیسی، دری (fa)، پشتو (ps) |
| امنیت | JWT، 2FA، CSRF، Audit Log، Rate Limit |

---

## ۲. ساختار مخزن (Repository Layout)

```
Nokta_V7 - Copy/
├── backend/                    # API سرور
├── frontend/                   # اپلیکیشن وب React
├── Nokta_App/
│   ├── frontend_mobile/        # PWA موبایل (Vite)
│   └── frontend_mobile/flutter/ # اپ Flutter
├── scripts/                    # اسکریپت‌های کمکی
├── deploy/                     # پیکربندی nginx تولید
├── account/                    # حساب‌های seed (accounts.md)
├── Monograph/                  # مستندات تحقیقی / مونوگراف
├── .github/workflows/          # CI/CD
├── package.json                # Monorepo root
├── README.md
└── Nokta_Info_Systme.md        # این فایل
```

---

## ۳. تکنولوژی‌ها (Tech Stack)

### Backend

| تکنولوژی | کاربرد |
|----------|--------|
| Node.js 18+ | Runtime |
| TypeScript 5.5 | زبان |
| Express 4 | فریم‌ورک HTTP |
| MongoDB + Mongoose 7 | پایگاه داده |
| JWT + bcryptjs | احراز هویت |
| Joi | اعتبارسنجی |
| Helmet, CORS, compression | امنیت و بهینه‌سازی |
| express-rate-limit | محدودیت درخواست |
| nodemailer | ایمیل |
| pdfkit, archiver, qrcode | PDF، فشرده‌سازی، QR |
| node-cron | کارهای زمان‌بندی‌شده |
| dayjs + jalaliday | تاریخ شمسی/هجری |

### Frontend (Web)

| تکنولوژی | کاربرد |
|----------|--------|
| React 18 | UI |
| Vite 5 | Build tool |
| TypeScript | زبان |
| Tailwind CSS 3 | استایل |
| React Router 6 | مسیریابی |
| TanStack React Query | State سرور |
| Zustand | State کلاینت (auth) |
| i18next | ترجمه |
| React Hook Form + Yup | فرم‌ها |
| Recharts | نمودار |
| Framer Motion | انیمیشن |
| vite-plugin-pwa | PWA / Offline |
| Vitest + Playwright | تست |

### Mobile (Flutter)

| تکنولوژی | کاربرد |
|----------|--------|
| Flutter 3.11+ | فریم‌ورک موبایل |
| Dart | زبان |
| Android / iOS | پلتفرم‌های پشتیبانی‌شده |

---

## ۴. معماری سیستم

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ React Web    │  │ Flutter App  │  │ Mobile PWA       │   │
│  │ :5173 / :4173│  │ Android/iOS  │  │ (Vite)           │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │             │
│         └─────────────────┼────────────────────┘             │
│                           │  HTTPS / REST /api               │
└───────────────────────────┼─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (:8081)                         │
│  Auth │ RBAC │ Modules │ Middleware │ Jobs │ Integrations   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB (nokta_academy)                   │
└─────────────────────────────────────────────────────────────┘
```

### الگوی Backend

- **Modular architecture:** هر ماژول در `backend/src/modules/<name>/`
- **Models:** Mongoose schemas در `backend/src/models/`
- **Services:** منطق تجاری در `backend/src/services/`
- **Middlewares:** auth, authorize, errorHandler, upload
- **Config:** `systemMasterRules.ts` — منبع حقیقت نقش‌ها و مجوزها

### الگوی Frontend

- **Feature-based:** `frontend/src/features/<module>/`
- **Config-driven CRUD:** `modules.ts` — تعریف ماژول‌ها، فیلدها، مجوزها
- **Layouts:** `DashboardLayout`, `AppShell`
- **Protected routes:** بر اساس نقش کاربر

---

## ۵. نقش‌ها و صلاحیت‌ها (Roles & Permissions)

### نقش‌های سازمانی (Enterprise Roles)

| کلید نقش | نام انگلیسی | نام دری (fa) | توضیح |
|----------|-------------|--------------|--------|
| `super_admin` | Super Admin | **ریس** | دسترسی کامل (`*`) — بالاترین سطح |
| `admin` | Admin | ادمین | مدیریت عملیاتی آکادمی |
| `teacher` | Teacher | استاد | تدریس، حضور، امتحان، نمره |
| `student` | Student | شاگرد | مشاهده نتایج، پرداخت، حضور |
| `parent` | Parent | والد/خانواده | پیگیری فرزند |
| `owner` | Owner | مالک | گزارش مالی، شعب، تحلیل |
| `branch_manager` | Branch Manager | مدیر شعبه | مدیریت شعبه |
| `system_automation` | System Automation | اتوماسیون سیستم | کارهای خودکار |

### نقش‌های Legacy (Alias)

| Legacy | نگاشت به |
|--------|----------|
| `family_student` | `parent` |
| `accountant` | `admin` |
| `librarian` | `branch_manager` |
| `user` | `student` |

### ماتریس مجوزها (خلاصه)

- **super_admin:** همه مجوزها (`*`)
- **admin:** مدیریت شاگرد، استاد، صنف، امتحان، پرداخت، مالی (بدون حذف کاربر/شعبه)
- **teacher:** حضور، امتحان، نمره، پیام، AI نتیجه
- **student:** مشاهده نتایج، پرداخت، حضور، پیام
- **parent:** مشابه student + پیگیری خانواده
- **owner:** مالی، گزارش، شعب (محدود)
- **branch_manager:** عملیات شعبه

**منبع کامل:** `backend/src/config/systemMasterRules.ts`  
**Frontend mirror:** `frontend/src/features/resources/config/modules.ts`

---

## ۶. ماژول‌ها و API Endpoints

پایه API: `http://localhost:8081/api`

| مسیر API | ماژول | توضیح |
|----------|--------|--------|
| `/auth` | احراز هویت | login, register, refresh, profile, 2FA |
| `/users` | کاربران | CRUD کاربران (super_admin) |
| `/branches` | شعب | مدیریت شعب |
| `/students` | شاگردان | ثبت‌نام، ویرایش، تخصیص صنف |
| `/teachers` | استادان | ثبت، حقوق، کمیسیون |
| `/classes` | صنف‌ها | ایجاد و مدیریت صنف |
| `/subjects` | مضامین | مضامین درسی |
| `/courses` | کورس‌ها | کورس‌های آموزشی |
| `/curriculum` | برنامه درسی | Curriculum |
| `/timetable` | جدول زمانی | برنامه هفتگی |
| `/attendance` | حضور و غیاب | ثبت و مشاهده حضور |
| `/exams` | امتحانات | ایجاد و مدیریت امتحان |
| `/results` | نتایج | نمرات و نتایج |
| `/payments` | پرداخت‌ها | فیس شاگرد |
| `/fees` | فیس | تنظیمات فیس |
| `/finance` | مالی | داشبورد مالی |
| `/salaries` | حقوق | حقوق استاد |
| `/payroll` | Payroll | محاسبه حقوق و مالیات |
| `/employee-tax` | مالیات کارمند | قوانین مالیات افغانستان |
| `/expenses` | مصارف | ثبت مصارف |
| `/families` | خانواده‌ها | ارتباط والد-شاگرد |
| `/books` | کتابخانه | کتاب‌ها |
| `/messages` | پیام‌ها | پیام‌رسانی داخلی |
| `/student-messages` | پیام شاگرد | پیام‌های شاگرد |
| `/notifications` | اعلان‌ها | Notification |
| `/roles` | نقش‌ها | مدیریت نقش سفارشی |
| `/permissions` | مجوزها | Permission management |
| `/dashboard` | داشبورد | آمار و KPI |
| `/reports` | گزارش‌ها | Export گزارش |
| `/audit` | Audit | لاگ فعالیت‌ها |
| `/language-settings` | زبان | تنظیمات زبان |
| `/admin` | Admin | عملیات مدیریتی |
| `/academy-financial-report` | گزارش مالی آکادمی | گزارش جامع مالی |
| `/search` | جستجو | جستجوی سراسری |
| `/ai-results` | AI Results | تحلیل هوشمند نتایج |
| `/uploads` | آپلود | تصاویر پروفایل و فایل |

**Health check:** `GET /health`

---

## ۷. مسیرهای Frontend (Web Routes)

### عمومی

| مسیر | صفحه |
|------|------|
| `/` | Redirect → `/home` |
| `/home` | صفحه اصلی عمومی |
| `/home/classes/:id` | جزئیات صنف |
| `/home/courses/:id` | جزئیات کورس |
| `/login` | ورود |
| `/register` | ثبت‌نام شاگرد |
| `/privacy` | حریم خصوصی |
| `/terms` | شرایط استفاده |
| `/forbidden` | دسترسی ممنوع |

### داشبورد (نیاز به ورود)

| مسیر | نقش‌های مجاز |
|------|--------------|
| `/dashboard` | همه نقش‌های اصلی |
| `/dashboard/super-admin` | super_admin |
| `/dashboard/super-admin/master` | super_admin (مرکز کنترل) |
| `/dashboard/manage-users` | super_admin |
| `/users` | super_admin |
| `/analytics` | super_admin, admin, owner |
| `/settings` | اکثر نقش‌ها |

### ماژول‌های CRUD (از `modules.ts`)

| مسیر | ماژول |
|------|--------|
| `/branches` | شعب |
| `/students` | شاگردان |
| `/teachers` | استادان |
| `/classes` | صنف‌ها |
| `/subjects` | مضامین |
| `/courses` | کورس‌ها |
| `/curriculum` | برنامه درسی |
| `/books` | کتاب‌ها |
| `/notifications` | اعلان‌ها |
| `/families` | خانواده‌ها |
| `/exams` | امتحانات |
| `/results` | نتایج |

### صفحات اختصاصی

| مسیر | توضیح |
|------|--------|
| `/attendance` | حضور و غیاب |
| `/timetable` | جدول زمانی |
| `/finance` | مالی |
| `/expenses` | مصارف |
| `/payments` | پرداخت‌ها |
| `/payroll` | حقوق و مالیات |
| `/reports` | گزارش‌ها |
| `/messages` | پیام‌ها |
| `/roles` | نقش‌ها |
| `/academy-financial-report` | گزارش مالی آکادمی |
| `/global-search` | جستجوی سراسری |
| `/security-events` | رویدادهای امنیتی |
| `/profile` | پروفایل کاربر |

---

## ۸. مدل‌های پایگاه داده (MongoDB Collections)

| Model | فایل | توضیح |
|-------|------|--------|
| User | `User.ts` | کاربران (همه نقش‌ها) |
| Student | `Student.ts` | پروفایل شاگرد |
| Teacher | `Teacher.ts` | پروفایل استاد |
| Branch | `Branch.ts` | شعب |
| Class | `Class.ts` | صنف‌ها |
| Subject | `Subject.ts` | مضامین |
| Course | `Course.ts` | کورس‌ها |
| Curriculum | `Curriculum.ts` | برنامه درسی |
| Timetable | `Timetable.ts` | جدول زمانی |
| Attendance | `Attendance.ts` | حضور |
| AttendancePolicy | `AttendancePolicy.ts` | سیاست حضور |
| Exam | `Exam.ts` | امتحان |
| Question | `Question.ts` | سوالات |
| Result / ExamResult | `Result.ts`, `ExamResult.ts` | نتایج |
| Payment | `Payment.ts` | پرداخت |
| FinanceEntry | `FinanceEntry.ts` | ورودی مالی |
| Expense | `Expense.ts` | مصارف |
| Salary / SalaryRecord / SalaryTransaction | — | حقوق |
| SalarySetting | `SalarySetting.ts` | تنظیمات حقوق |
| TaxRule / TaxPercentageSetting | — | مالیات |
| Family / FamilyLink / Parent | — | خانواده |
| Book | `Book.ts` | کتاب |
| Message / StudentMessage | — | پیام |
| Notification / Announcement | — | اعلان |
| Role / Permission | — | نقش و مجوز |
| AuditLog | `AuditLog.ts` | Audit |
| AIResultInsight / AIClassExamInsight | — | تحلیل AI |
| LanguageSetting | `LanguageSetting.ts` | زبان |
| SessionToken | `SessionToken.ts` | نشست |
| StationerySale | `StationerySale.ts` | فروش لوازم |
| LearningResource | `LearningResource.ts` | منابع آموزشی |

**اتصال پیش‌فرض:** `mongodb://localhost:27017/nokta_academy`

---

## ۹. احراز هویت و امنیت

### Auth Flow

1. **Login** → JWT access token (15m) + refresh token (7d)
2. **2FA** — پشتیبانی از ورود دو مرحله‌ای
3. **Refresh** — تمدید token
4. **Profile** — مشاهده/ویرایش پروفایل
5. **Password** — تغییر، reset، forgot

### Endpoint‌های Auth

```
POST /api/auth/login
POST /api/auth/login/2fa
POST /api/auth/register/student
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/profile
PUT  /api/auth/profile
POST /api/auth/profile/change-password
```

### امنیت

- **Helmet** — HTTP headers
- **Rate limiting** — auth: 10/min, write: 480/15min, read: 2400/15min
- **CSRF** — token-based
- **bcrypt** — 12 rounds
- **Account lockout** — پس از تلاش‌های ناموفق
- **Audit logging** — ثبت فعالیت‌های حساس
- **Gitleaks** — اسکن secret در CI

---

## ۱۰. چندزبانگی (i18n)

| کد | زبان | جهت | پوشه |
|----|------|-----|------|
| `en` | English | LTR | `frontend/src/locales/messages/en/` |
| `fa` | Dari (دری) | RTL | `frontend/src/locales/messages/fa/` |
| `ps` | Pashto (پشتو) | RTL | `frontend/src/locales/messages/ps/` |

### فایل‌های ترجمه (هر زبان)

`auth`, `common`, `dashboard`, `students`, `classes`, `subjects`, `exams`, `results`, `attendance`, `payments`, `finance`, `books`, `issue_books`, `return_books`, `messages`, `notifications`, `roles`, `audit`, `reports`, `errors`, `legal`, `enterprise`

### نکته ترجمه دری

نقش `super_admin` در زبان دری به **«ریس»** ترجمه شده (نه «سوپر ادمین»).  
فایل‌ها: `fa/common.json`, `fa/auth.json`, `fa/dashboard.json`, `fa/roles.json`

---

## ۱۱. مالی و حقوق (Finance & Payroll)

### پرداخت شاگرد

- فیس پیش‌فرض seed: **۱۰۰۰ AFN**
- ثبت پرداخت، فاکتور، باقی‌مانده

### حقوق استاد

- **انواع حقوق:** fixed, percentage, fixed_plus_percentage
- **کمیسیون:** ۲۰–۴۰٪ (بر اساس seed)
- **۱۰ شاگرد** به ازای هر استاد در داده seed

### مالیات افغانستان

- سرویس: `afghanistanSalaryTaxService.ts`
- محاسبه payroll با `payrollCalculation.service.ts`
- پشتیبانی از سال/ماه هجری (`jalaliday`)

---

## ۱۲. اپلیکیشن موبایل Flutter

**مسیر:** `Nokta_App/frontend_mobile/flutter/`

### Features موبایل

| Feature | Screen |
|---------|--------|
| Auth | login, register, 2FA |
| Dashboard | dashboard_screen |
| Attendance | attendance_screen |
| Timetable | timetable_screen |
| Results | results_screen |
| Payments | payments_screen |
| Finance | salaries, expenses, teacher_earnings |
| Messages | messages, compose, detail |
| Family | family_home, student_detail |
| Profile | profile_screen |
| Settings | settings, about |
| Public | public_home, catalog_detail |
| Audit | audit_screen |

### API Base URL

| محیط | URL |
|------|-----|
| Dev (simulator) | `http://localhost:8081/api` |
| Android emulator | `http://10.0.2.2:8081/api` |
| Physical device | `http://192.168.x.x:8081/api` |
| Production | `https://your-domain.com/api` |

---

## ۱۳. راه‌اندازی و توسعه

### پیش‌نیازها

- Node.js 18+
- npm
- MongoDB
- Flutter 3.11+ (برای موبایل)

### شروع سریع (Development)

```bash
# از root پروژه
npm install
npm ci --prefix backend
npm ci --prefix frontend
npm run dev
```

- **Web:** http://localhost:5173
- **API:** http://localhost:8081/api
- **Health:** http://localhost:8081/health

### Backend

```bash
cd backend
copy .env.example .env
npm install
npm run seed          # داده نمونه
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Windows Offline

```bat
Start-Nokta-Academy-Windows.bat
```

- App: http://127.0.0.1:4173
- API: http://127.0.0.1:8081/api

---

## ۱۴. متغیرهای محیطی Backend (.env)

| متغیر | پیش‌فرض | توضیح |
|-------|---------|--------|
| `PORT` | 8081 | پورت سرور |
| `MONGO_URI` | mongodb://localhost:27017/nokta_academy | MongoDB |
| `JWT_SECRET` | — | کلید JWT (≥32 char) |
| `JWT_EXPIRES_IN` | 15m | انقضای access token |
| `REFRESH_SECRET` | — | کلید refresh |
| `REFRESH_EXPIRES_IN` | 7d | انقضای refresh |
| `BCRYPT_ROUNDS` | 12 | هش رمز |
| `RATE_LIMIT_*` | — | محدودیت درخواست |
| `EMAIL_*` | console | ایمیل |
| `SMS_*` | console | SMS (Twilio) |
| `AI_PROVIDER_*` | disabled | OpenAI integration |
| `PAYMENT_PROVIDER` | manual | Stripe/manual |
| `ENABLE_JOBS` | true | Cron jobs |

**فایل نمونه:** `backend/.env.example`

---

## ۱۵. اسکریپت‌های Backend

| دستور | کاربرد |
|-------|--------|
| `npm run dev` | سرور development |
| `npm run build` | کامپایل TypeScript |
| `npm run start` | اجرای production |
| `npm run test` | تست‌های واحد |
| `npm run seed` | پر کردن DB با داده نمونه |
| `npm run create-super-admin` | ایجاد super admin |
| `npm run restore-super-admin` | بازیابی super admin |
| `npm run clear-database` | پاک کردن DB |
| `npm run repair-data-integrity` | تعمیر یکپارچگی داده |
| `npm run validate-api` | اعتبارسنجی API |

---

## ۱۶. اسکریپت‌های Frontend

| دستور | کاربرد |
|-------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Build production |
| `npm run typecheck` | بررسی TypeScript |
| `npm run test` | Vitest |
| `npm run test:e2e` | Smoke E2E |
| `npm run validate-permissions` | هماهنگی منو و مجوز |
| `npm run validate-translations` | اعتبارسنجی i18n |
| `npm run validate-dari` | بررسی اصطلاحات دری |

---

## ۱۷. CI/CD (GitHub Actions)

**فایل:** `.github/workflows/ci.yml`

| Job | کار |
|-----|-----|
| secret-scan | Gitleaks (advisory) |
| backend | lint, build, test |
| frontend | typecheck, test, validate-translations, validate-permissions, build |
| e2e | smoke test |

---

## ۱۸. داده Seed و حساب‌های نمونه

**اسکریپت:** `backend/src/scripts/seed.ts`  
**فایل حساب‌ها:** `account/accounts.md`

### خلاصه داده Seed

| نوع | تعداد تقریبی |
|-----|--------------|
| Super Admin | 1 |
| Admin | 5 |
| Teacher | 10 (هر کدام ۱۰ شاگرد) |
| Student | 100 |
| Family (parent) | 50 |
| Accountant | 5 |
| Librarian | 5 |
| Class | 10 |
| Subject | 20+ |

### حساب Super Admin (seed)

```
Email: maihan@gmail.com
Password: 12345678
Role: super_admin
```

### Demo Login (development)

```
Email: admin@gmail.com
Password: Admin123!
Role: super_admin
```

---

## ۱۹. Deploy (Production)

**مسیر:** `deploy/nginx/`

- nginx reverse proxy
- TLS certificates در `deploy/nginx/certs/`
- Frontend: static build از `frontend/dist`
- Backend: Node.js روی پورت 8081

---

## ۲۰. ساختار Frontend Features

```
frontend/src/features/
├── auth/           # ورود، ثبت‌نام
├── dashboard/      # داشبورد، analytics، super admin
├── resources/      # CrudPage + modules config
├── attendance/     # حضور و غیاب
├── timetable/      # جدول زمانی
├── finance/        # مالی، مصارف
├── payments/       # پرداخت
├── payroll/        # حقوق
├── reports/        # گزارش
├── messages/       # پیام
├── roles/          # نقش
├── search/         # جستجو
├── security/       # رویداد امنیتی
├── results/        # نتایج + AI insights
├── ai/             # دستیار AI
├── academy-financial-report/
├── enterprise/
├── catalog/
└── standards/
```

---

## ۲۱. ساختار Backend Modules

```
backend/src/modules/
├── admin/
├── ai-results/
├── academy-financial-report/
├── attendance/
├── audit/
├── auth/
├── books/
├── branches/
├── classes/
├── courses/
├── curriculum/
├── dashboard/
├── exams/
├── expenses/
├── families/
├── fees/
├── finance/
├── language-settings/
├── messages/
├── notifications/
├── payments/
├── payroll/
├── permissions/
├── reports/
├── results/
├── roles/
├── salaries/
├── search/
├── student-messages/
├── students/
├── subjects/
├── teachers/
├── timetable/
├── uploads/
└── users/
```

---

## ۲۲. تست‌ها

### Backend Tests

- authorize middleware
- route policy / permissions
- timetable validation
- class schedule
- teacher compensation / salary
- Afghanistan tax
- payroll commission
- AI results analysis & access
- public contact schema
- HTTP errors

### Frontend Tests

- Vitest (unit)
- Playwright (E2E browser)
- offline runtime validation
- permission menu validation
- translation validation

---

## ۲۳. PWA و Offline

- Service Worker: `frontend/public/sw.js`
- vite-plugin-pwa برای cache
- Offline banner component
- Windows offline launcher: `Start-Nokta-Academy-Windows.bat`

---

## ۲۴. یکپارچگی‌های خارجی (Integrations)

| سرویس | حالت Dev | Production |
|-------|----------|------------|
| Email | console / Mailhog | SMTP |
| SMS | console | Twilio / HTTP gateway |
| Payment | manual | Stripe |
| AI | disabled | OpenAI API |

**اعتبارسنجی:** `npm run validate-integrations --prefix backend`

---

## ۲۵. Monograph / مستندات تحقیقی

پوشه `Monograph/` شامل:

- مونوگراف سیستم (APA)
- دیاگرام‌ها (architecture, ERD, use case, class diagram)
- پرسشنامه ارزیابی
- نسخه دری و انگلیسی
- فایل‌های Mendeley references (.ris)

---

## ۲۶. نکات مهم برای توسعه‌دهندگان

1. **نقش‌ها:** هرگز کلید `super_admin` را تغییر ندهید — فقط ترجمه fa را ویرایش کنید.
2. **modules.ts:** افزودن ماژول جدید نیاز به تعریف در frontend و backend دارد.
3. **systemMasterRules.ts:** منبع حقیقت مجوزهای backend.
4. **validate-permissions:** پس از تغییر منو/مجوز اجرا کنید.
5. **Secrets:** `.env` را commit نکنید.
6. **Windows:** از `npm.cmd` استفاده کنید اگر PowerShell مسدود است.

---

## ۲۷. پورت‌ها و URL‌ها (خلاصه)

| سرویس | Dev | Production / Offline |
|-------|-----|----------------------|
| Frontend Web | :5173 | :4173 |
| Backend API | :8081 | :8081 |
| MongoDB | :27017 | :27017 |
| API Base | /api | /api |
| Health | /health | /health |

---

## ۲۸. لایسنس و مالکیت

پروژه **Nokta Academy Management System** — سیستم مدیریت آکادمی نوکتا.  
برای استفاده تجاری و deploy، تنظیمات `.env` و secrets تولید را با `npm run secrets:generate` از root ایجاد کنید.

---

*این سند به‌صورت خودکار از ساختار واقعی مخزن Nokta V7 تهیه شده است.*
