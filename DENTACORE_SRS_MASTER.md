# DentaCore: Smart Clinic & Dental CRM
## To'liq Xalqaro Standart Texnik Topshiriq (Software Requirements Specification — SRS)
**Hujjat Kodi:** `SRS-DENTACORE-2026-V2`  
**Standart:** ISO/IEC/IEEE 29148:2018 & IEEE 830-1998  
**Loyihaning Turi:** Enterprise Healthcare SaaS / Smart Dental Practice Management Platform  
**Backend:** C# ASP.NET Core 8 (Clean Architecture, EF Core, PostgreSQL 16, MediatR, SignalR)  
**Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (Apple Glassmorphism UI)  
**Holati:** Production-Ready Specification (Mo'ljallangan: AI Coding Agentlar va Senior Developerlar uchun)

---

## MUNDARIJA

1. [Loyiha Umumiy Maqsadi va Tizim Viziyasi](#1-loyiha-umumiy-maqsadi-va-tizim-viziyasi)
2. [Tizim Arxitekturasi va Interfeyslarni Qat'iy Ajratish](#2-tizim-arxitekturasi-va-interfeyslarni-qatiy-ajratish)
3. [Foydalanuvchi Rollari va Dinamik Ruxsatlar Tizimi (RBAC & PBAC)](#3-foydalanuvchi-rollari-va-dinamik-ruxsatlar-tizimi-rbac--pbac)
4. [Ma'lumotlar Bazasi Modeli va DDL Sxemalari (PostgreSQL 16)](#4-malumotlar-bazasi-modeli-va-ddl-sxemalari-postgresql-16)
5. [Asosiy Biznes Mantiq va Algoritmlar](#5-asosiy-biznes-mantiq-va-algoritmlar)
   - 5.1. Dinamik Slot Generatsiyasi va Smart Scheduling
   - 5.2. Double Booking Himoyasi (2 Darajali Karantin)
   - 5.3. Interaktiv Tish Formulasi (FDI 11–48 Odontogram)
   - 5.4. Moliyaviy Modul, Kassa, Avans va Shifokor Ulushi (% Bonus)
   - 5.5. Super Admin Ruxsatlar Boshqaruv Jadvali (Dynamic Permissions Matrix)
6. [API Spetsifikatsiyasi (RESTful & OpenAPI 3.1)](#6-api-spetsifikatsiyasi-restful--openapi-31)
7. [Real-Vaqt Kommunikatsiya Protokoli (SignalR Hub)](#7-real-vaqt-kommunikatsiya-protokoli-signalr-hub)
8. [Frontend Arxitekturasi va Apple Glassmorphism Dizayn Tizimi](#8-frontend-arxitekturasi-va-apple-glassmorphism-dizayn-tizimi)
9. [Xavfsizlik, Tibbiy Maxfiylik (HIPAA/GDPR) va Audit Qoidalari](#9-xavfsizlik-tibbiy-maxfiylik-hipaagdpr-va-audit-qoidalari)
10. [Nofunksional Talablar (NFR)](#10-nofunksional-talablar-nfr)
11. [AI Dasturchi Agentlar uchun Ko'rsatma (Implementation Guide)](#11-ai-dasturchi-agentlar-uchun-korsatma-implementation-guide)

---

## 1. LOYIHA UMUMIY MAQSADI VA TIZIM VIZIYASI

### 1.1. Muammo va Kontekst
Zamonaviy stomatologiya va tibbiyot klinikalarida bemorlarni qabul qilish, navbatlarni boshqarish, tish kartalarini to'ldirish va kassa hisob-kitoblarida quyidagi jiddiy muammolar mavjud:
- **Double Booking (Bir vaqtga ikki bemor yozilishi):** Registratura xodimi telefon orqali bemorni yozayotgan soniyada, boshqa bemor sayt orqali xuddi shu slotni band qiladi.
- **Ma'lumotlar chalkashligi va qog'ozbozlik:** Tish holatlari (karies, plomba, implant) qog'oz kartalarda yo'qoladi yoki shifokorlar o'rtasida bemor tarixi uzilib qoladi.
- **Moliyaviy shaffoflikning yo'qligi:** Qisman to'lovlar (avans), qarzdorliklar va shifokorlarning ko'rsatilgan xizmatdan oladigan foizlari qo'lda hisoblanishi natijasida xatoliklar va tushunmovchiliklar yuzaga keladi.
- **Ruxsatlarning cheklanmaganligi:** Registrator yoki shifokor klinikaning umumiy kassasini ko'rishi, yoki shifokor o'ziga tegishli bo'lmagan bemorlarning shaxsiy telefon raqamlarini bilib olishi ma'lumotlar xavfsizligiga tahdiddir.

### 1.2. Loyiha Missiyasi
**DentaCore** — stomatologik klinikalar faoliyatini noldan to'liq raqamlashtiruvchi, xalqaro tibbiy standartlarga javob beradigan, xavfsiz, yuqori yuklamalarga bardoshli va estetik jihatdan mukammal boshqaruv platformasidir.
Tizim ikkita tubdan mustaqil qismga ajratiladi:
1. **Public Client Portal:** Bemorlar uchun hech qanday yuklamalarsiz, shifokorlarni tanlash, 30 daqiqalik bo'sh vaqtlarni ko'rish va onlayn navbatga yozilish portali hamda shaxsiy kabinet.
2. **Secure Admin & Staff CRM:** Super Admin, Shifokorlar va Administratorlar uchun mo'ljallangan, murakkab operatsion boshqaruv, kalendarlar, interaktiv FDI odontogramma va kassa boshqaruvi.

---

## 2. TIZIM ARXITEKTURASI VA INTERFEYSLARNI QAT'IY AJRATISH

### 2.1. High-Level Tizim Topologiyasi

```
+---------------------------------------------------------------------------------------------------------+
|                                           MIJOZLAR QATLAMI (CLIENT TIER)                                |
|                                                                                                         |
|   +------------------------------------+             +----------------------------------------------+   |
|   |    Public Client Portal & Wizard   |             |           Secure Admin CRM Workstation       |   |
|   |  - Bemorlar uchun Ro'yxatdan o'tish|             |  - SuperAdmin / Receptionist / Doctor        |   |
|   |  - Bo'sh slotlar va Onlayn qabul   |             |  - Dinamik Kalendar & EMR Karta              |   |
|   |  - Bemor Shaxsiy Kabineti          |             |  - FDI 11-48 Odontogram & Kassa Moduli       |   |
|   |  (React 19 + Tailwind Glassmorphism)|            |  (React 19 + TanStack Query + Motion + Hub)  |   |
|   +-----------------+------------------+             +----------------------+-----------------------+   |
+---------------------|-------------------------------------------------------|---------------------------+
                      | HTTPS (REST API)                                      | HTTPS (REST) + WSS (SignalR)
                      v                                                       v
+---------------------------------------------------------------------------------------------------------+
|                                     REVERSE PROXY / APPLICATION GATEWAY                                 |
|                                       Nginx (TLS 1.3, Rate-Limit, Gzip)                                 |
+-------------------------------------------------+-------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------------+
|                                      ASP.NET CORE 8 BACKEND (WEB API)                                   |
|                                                                                                         |
|  [Global Exception Filter (RFC 7807)] -> [CORS] -> [Rate Limiter] -> [JWT Handler] -> [Audit Logger]   |
|                                                                                                         |
|  +-------------------------------------+             +-----------------------------------------------+  |
|  |       REST API Controllerlar        |             |            SignalR Real-Time Hubs             |  |
|  |  - /api/v1/public (Booking & Slots) |             |  - /hubs/clinic                               |  |
|  |  - /api/v1/crm (Staff Operations)   |             |    * OnAppointmentCreated                     |  |
|  |  - /api/v1/admin (SuperAdmin)       |             |    * OnStatusChanged                          |  |
|  |  - /api/v1/portal (Patient Portal)  |             |    * DoctorQueueRoom_{id}                     |  |
|  +------------------+------------------+             +-----------------------+-----------------------+  |
|                     |                                                        |                          |
|                     v                                                        |                          |
|  +-----------------------------------------------------------------------+   |                          |
|  |                Application Core (Clean Architecture + MediatR)         |   |                          |
|  |  - SlotCalculationEngine (30 minutlik grid va shifokor ish jadvali)    |   |                          |
|  |  - DoubleBookingGuard (IsolationLevel + DB Constraint tekshiruvi)     |   |                          |
|  |  - OdontogramStateManager (FDI 11-48 JSONB saqlash va tekshirish)     |   |                          |
|  |  - FinancialCalculationEngine (Avans, Qarz, Shifokor foizi)          |   |                          |
|  |  - PermissionAuthorizationHandler (Dinamik PBAC va Field Masking)     |   |                          |
|  +----------------------------------+------------------------------------+   |                          |
|                                     |                                        |                          |
|                                     v                                        |                          |
|  +-----------------------------------------------------------------------+   |                          |
|  |                   Infrastructure Tier (Persistence & EF Core 8)       |   |                          |
|  |  - AppDbContext (Npgsql PostgreSQL Provider)                          |   |                          |
|  |  - Optimistic Concurrency Interceptor (Version / xmin)                |   |                          |
|  |  - Audit Log Trail Generator                                          |   |                          |
|  +----------------------------------+------------------------------------+   |                          |
+-------------------------------------|----------------------------------------|--------------------------+
                                      |                                        |
                                      v                                        v
+---------------------------------------------------------------------------------------------------------+
|                                       MA'LUMOTLAR BAZASI (POSTGRESQL 16)                                |
|                                                                                                         |
|  - Relational Tables: Users, Roles, Permissions, UserPermissions, Doctors, Appointments, Invoices       |
|  - Hardware Concurrency: `btree_gist` Exclusion Constraints (tsrange overlap blocking)                  |
|  - Clinical History: `jsonb` ToothRecords va ToothRecordHistories with GIN Indexes                      |
+---------------------------------------------------------------------------------------------------------+
```

### 2.2. Interfeyslar va Yo'nalishlar Izolyatsiyasi
- **Jismoniy va Mantiqiy Ajratish:**
  - Bemorlar kiradigan `Client Portal` frontendda `/` va `/portal/*` yo'nalishlarida joylashadi. Unga kirish uchun xodim ruxsatnomasi talab qilinmaydi.
  - Xodimlar boshqaruv paneli `Admin CRM` esa `/admin` yoki `crm.domain.com` orqali ochiladi.
- **Route Guards & Frontend Isolation:**
  - React Router darajasida `RequireAuth` va `RequireRole` guardlari qo'yilgan. Agar oddiy bemor tokeni bilan xodim sahifalariga kirmoqchi bo'linsa, router uni darhol `/` ga yoki `/403` ga haydaydi.
  - **Asosiy Qoida:** Frontenddagi yashirish bu faqat UX. Barcha xavfsizlik va ruxsatlar tekshiruvi 100% C# Backend Web API darajasida amalga oshiriladi.

---

## 3. FOYDALANUVCHI ROLLARI VA DINAMIK RUXSATLAR TIZIMI (RBAC & PBAC)

Tizim statik rollar bilan cheklanmaydi. U **Dinamik Huquqlar (Granular Policy-Based Access Control — PBAC)** mexanizmi asosida ishlaydi.

### 3.1. Asosiy Rollar Tavsifi
1. **Super Admin (Klinika Rahbari / Egasi):**
   - Tizimning mutlaq boshqaruvchisi. Barcha bo'limlar, shifokorlar, qabullar, kassa, sof foyda va moliyaviy hisobotlarni ko'radi.
   - Har bir xodimga alohida shaxsiy ruxsatlarni (Overrides) bera oladi yoki bekor qila oladi.
2. **Doctor (Shifokor):**
   - Faqat o'zining ish grafigi, o'ziga yozilgan bemorlar navbatini ko'radi.
   - Elektron tibbiy karta (EMR) va interaktiv Tish Formulasini (Odontogram) to'ldirish huquqiga ega.
   - Boshqa shifokorlarning bemorlarini yoki klinikaning umumiy kassasini ko'ra olmaydi.
3. **Receptionist (Administrator / Qabulxona xodimi):**
   - Barcha shifokorlarning kalendarini ko'radi, bemorlarni yozadi, vaqtlarini o'zgartiradi.
   - Bemorlardan to'lovlarni qabul qiladi, chek chiqaradi, qarz holatini qayd etadi.
   - Bemorlarning tibbiy xulosalari va tish formulasini o'zgartirish huquqiga ega emas (faqat o'qish yoki umuman yopiq).
4. **Patient (Bemor):**
   - Faqat o'zining shaxsiy kabinetiga kiradi: o'zining bo'lajak qabullari, shifokor bergan reseptlar, o'z tishlarining holati xaritasi va to'lov/qarz tarixini ko'radi.

---

### 3.2. Dinamik Ruxsatlar va Sezgir Maydonlar (Sensitive Fields) Ro'yxati

Tizimda modullar ustunlar va amallar (View, Edit, Delete) qatorlar sifatida boshqariladi.

#### Standart Modul Ruxsat Kodlari (Canonical Code: `Module.Action`):
| Modul Koding | Mavjud Amallar | Tavsifi |
| :--- | :--- | :--- |
| `Calendar` | `View`, `Edit`, `Delete` | Qabullarni ko'rish, yaratish, ko'chirish yoki bekor qilish |
| `PatientsDb` | `View`, `Edit`, `Delete` | Bemorlar ro'yxatini ko'rish, yangi bemor ochish, ma'lumotlarni tahrirlash |
| `Odontogram` | `View`, `Edit`, `Delete` | Tish xaritasini ko'rish, holatini o'zgartirish, tashxis yozish |
| `Billing` | `View`, `Edit`, `Delete` | Kassa xizmatlarini ko'rish, hisob-faktura chiqarish, to'lov qabul qilish |
| `Prescriptions` | `View`, `Edit`, `Delete` | Dori-darmon reseptlarini yozish va chop etish |
| `Staff` | `View`, `Edit`, `Delete` | Xodimlarni (shifokor, registrator) qo'shish va tahrirlash |
| `Services` | `View`, `Edit`, `Delete` | Xizmatlar preyskurantini (narxlarini) belgilash |
| `Reports` | `View`, `Edit`, `Delete` | Umumiy klinika foydasi va moliyaviy statistika hisobotlari |
| `Permissions` | `View`, `Edit`, `Delete` | Xodimlarning huquqlarini o'zgartirish (faqat Super Admin) |

#### Maxsus Sezgir Maydonlar Ruxsatlari (Sensitive Permission Codes):
Ushbu ruxsatlar individual xodim darajasida yoqiladi yoki o'chiriladi:
- `SensitiveFields.CanViewPatientPhone` — Shifokor yoki xodim bemorning telefon raqamini ko'ra oladimi? (Agar o'chirilsa, API javobida telefon `+998 90 *** ** 12` ko'rinishida niqoblanadi).
- `SensitiveFields.CanViewTotalCashbox` — Administrator yoki xodim umumiy kunlik kassa tushumini ko'ra oladimi? (Agar o'chirilsa, faqat o'zi qabul qilgan cheklar summasi ko'rinadi).
- `SensitiveFields.CanViewOwnSalaryOnly` — Shifokor faqat o'zining ko'rsatgan xizmatidan tushgan shaxsiy ulushini ko'ra oladi (Klinikaning sof daromadini ko'ra olmaydi).

---

### 3.3. Ruxsatlarni Hisoblash Ierarxiyasi (Resolution Order)
Har bir API so'rovida xodimning huquqi quyidagi qat'iy ketma-ketlikda tekshiriladi:
1. **Super Admin Check:** Agar foydalanuvchi roli `SuperAdmin` bo'lsa — barcha huquqlar avtomatik `TRUE` (Cheklovsiz).
2. **User Override Check:** `UserPermissions` jadvalida ushbu aniq foydalanuvchi (`UserId`) uchun maxsus qoida yozilganmi?
   - Agar `IsGranted == false` bo'lsa -> Darhol **RAD ETILADI (DENY)** (Rolida bor bo'lsa ham).
   - Agar `IsGranted == true` bo'lsa -> Darhol **RUXSAT BERILADI (ALLOW)**.
3. **Role Default Check:** Agar foydalanuvchi uchun alohida yozuv bo'lmasa, uning asosiy roliga (`RolePermissions`) tegishli ruxsat tekshiriladi.
4. **Default Stance:** Agar hech qayerda topilmasa — **DENY (RAD ETISH)**.

---

## 4. MA'LUMOTLAR BAZASI MODELI VA DDL SXEMALARI (POSTGRESQL 16)

Bazaning fizik yaxlitligi va yuqori tezlikda ishlashi uchun to'liq SQL DDL sxemasi:

```sql
-- PostgreSQL 16 uchun zaruriy kengaytmalar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Rollar jadvali
CREATE TABLE "Roles" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(50) NOT NULL UNIQUE,
    "DisplayName" VARCHAR(100) NOT NULL,
    "Description" TEXT
);

INSERT INTO "Roles" ("Name", "DisplayName", "Description") VALUES
('SuperAdmin', 'Klinika Rahbari', 'Barcha vakolatlarga ega tizim egasi'),
('Doctor', 'Shifokor', 'Qabul va davolash ishlarini olib boruvchi tibbiy xodim'),
('Receptionist', 'Administrator (Resepshn)', 'Bemorlarni kutib oluvchi va kassani yurituvchi xodim'),
('Patient', 'Bemor', 'Onlayn navbat oluvchi mijoz');

-- 2. Foydalanuvchilar (Xodimlar va Bemorlar)
CREATE TABLE "Users" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "FullName" VARCHAR(160) NOT NULL,
    "Email" VARCHAR(120) NOT NULL UNIQUE,
    "PhoneNumber" VARCHAR(32) NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE RESTRICT,
    "DoctorId" UUID NULL,
    "PatientId" UUID NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NULL
);

-- 3. Ruxsatlar lug'ati
CREATE TABLE "Permissions" (
    "Id" SERIAL PRIMARY KEY,
    "Module" VARCHAR(50) NOT NULL,
    "Action" VARCHAR(50) NOT NULL,
    "Code" VARCHAR(100) NOT NULL UNIQUE,
    "Description" TEXT
);

-- 4. Rol bo'yicha ruxsatlar (Standart shablon)
CREATE TABLE "RolePermissions" (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" INT NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
    "PermissionId" INT NOT NULL REFERENCES "Permissions"("Id") ON DELETE CASCADE,
    "IsGranted" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "uq_role_permission" UNIQUE ("RoleId", "PermissionId")
);

-- 5. Foydalanuvchi bo'yicha shaxsiy ruxsatlar (SuperAdmin Overrides)
CREATE TABLE "UserPermissions" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "PermissionId" INT NOT NULL REFERENCES "Permissions"("Id") ON DELETE CASCADE,
    "IsGranted" BOOLEAN NOT NULL,
    CONSTRAINT "uq_user_permission" UNIQUE ("UserId", "PermissionId")
);

-- 6. Shifokorlar profili
CREATE TABLE "Doctors" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "FullName" VARCHAR(160) NOT NULL,
    "Email" VARCHAR(120) NOT NULL,
    "PhoneNumber" VARCHAR(32) NOT NULL,
    "Specialty" VARCHAR(100) NOT NULL,
    "ColorCode" VARCHAR(16) NOT NULL DEFAULT '#0D9488',
    "ExperienceYears" INT NOT NULL DEFAULT 1,
    "Rating" NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    "StartHour" TIME NOT NULL DEFAULT '09:00:00',
    "EndHour" TIME NOT NULL DEFAULT '18:00:00',
    "LunchStart" TIME NOT NULL DEFAULT '13:00:00',
    "LunchEnd" TIME NOT NULL DEFAULT '14:00:00',
    "WorkingDays" VARCHAR(50) NOT NULL DEFAULT '1,2,3,4,5,6',
    "ProfitSharePercent" NUMERIC(5,2) NOT NULL DEFAULT 30.00,
    "BaseSalary" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bemorlar jadvali
CREATE TABLE "Patients" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "FullName" VARCHAR(160) NOT NULL,
    "PhoneNumber" VARCHAR(32) NOT NULL UNIQUE,
    "BirthDate" DATE NULL,
    "Gender" VARCHAR(10) NOT NULL DEFAULT 'Erkak',
    "Notes" TEXT NULL,
    "TotalDebt" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastVisit" DATE NULL
);
CREATE INDEX "idx_patients_phone" ON "Patients"("PhoneNumber");

-- 8. Xizmatlar preyskuranti
CREATE TABLE "ServiceItems" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(200) NOT NULL,
    "Category" VARCHAR(50) NOT NULL DEFAULT 'Terapiya',
    "Price" NUMERIC(14,2) NOT NULL,
    "DurationMinutes" INT NOT NULL DEFAULT 30,
    "Description" TEXT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. Qabullar (Appointments)
CREATE TABLE "Appointments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Doctors"("Id") ON DELETE RESTRICT,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "ServiceId" UUID NULL REFERENCES "ServiceItems"("Id") ON DELETE SET NULL,
    "Date" DATE NOT NULL,
    "StartTime" TIME NOT NULL,
    "EndTime" TIME NOT NULL,
    "StartTimeUtc" TIMESTAMPTZ NOT NULL,
    "EndTimeUtc" TIMESTAMPTZ NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "Source" VARCHAR(20) NOT NULL DEFAULT 'CRM',
    "Notes" TEXT NULL,
    "BookingCode" VARCHAR(20) NOT NULL,
    "Version" INT NOT NULL DEFAULT 1,
    "CreatedByUserId" UUID NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CompletedAt" TIMESTAMPTZ NULL
);

-- DOUBLE BOOKINGNING OLDINI OLISH UCHUN POSTGRESQL APPARAT CHEKLOVI (EXCLUSION CONSTRAINT)
ALTER TABLE "Appointments"
ADD CONSTRAINT "no_overlapping_doctor_appointments"
EXCLUDE USING gist (
    "DoctorId" WITH =,
    tsrange("StartTimeUtc", "EndTimeUtc", '[)') WITH &&
)
WHERE ("Status" NOT IN ('Cancelled', 'NoShow'));

-- 10. Maxsus band qilingan slotlar (Tezkor tekshirish uchun)
CREATE TABLE "BookedSlots" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Doctors"("Id") ON DELETE CASCADE,
    "Date" DATE NOT NULL,
    "StartTime" TIME NOT NULL,
    "AppointmentId" UUID NOT NULL REFERENCES "Appointments"("Id") ON DELETE CASCADE,
    "ReservedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_doctor_date_slot" UNIQUE ("DoctorId", "Date", "StartTime")
);

-- 11. Tish Formulasi (FDI 11-48 Odontogramma)
CREATE TABLE "ToothRecords" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE CASCADE,
    "ToothNumber" INT NOT NULL CHECK ("ToothNumber" BETWEEN 11 AND 48),
    "Condition" VARCHAR(40) NOT NULL DEFAULT 'Healthy',
    "SurfacesJson" JSONB NOT NULL DEFAULT '[]',
    "Diagnosis" TEXT NULL,
    "TreatmentPlan" TEXT NULL,
    "Cost" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "UpdatedByUserId" UUID NULL,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_patient_tooth" UNIQUE ("PatientId", "ToothNumber")
);
CREATE INDEX "idx_tooth_surfaces_gin" ON "ToothRecords" USING gin ("SurfacesJson");

-- 12. Tish Tarixi (Audit Trail)
CREATE TABLE "ToothRecordHistories" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ToothRecordId" UUID NOT NULL REFERENCES "ToothRecords"("Id") ON DELETE CASCADE,
    "PatientId" UUID NOT NULL,
    "ToothNumber" INT NOT NULL,
    "SnapshotJson" JSONB NOT NULL,
    "ChangedByUserId" UUID NULL,
    "ChangedByName" VARCHAR(160) NOT NULL,
    "ChangedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Hisob-Fakturalar (Invoices)
CREATE TABLE "Invoices" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "AppointmentId" UUID NULL REFERENCES "Appointments"("Id") ON DELETE SET NULL,
    "DoctorId" UUID NULL REFERENCES "Doctors"("Id") ON DELETE SET NULL,
    "ReceiptNumber" VARCHAR(50) NOT NULL UNIQUE,
    "TotalAmount" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "DiscountAmount" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "PaidAmount" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "DebtAmount" NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Unpaid',
    "CreatedByUserId" UUID NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. To'lovlar (Payments)
CREATE TABLE "Payments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "InvoiceId" UUID NOT NULL REFERENCES "Invoices"("Id") ON DELETE CASCADE,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "Amount" NUMERIC(14,2) NOT NULL CHECK ("Amount" > 0),
    "Method" VARCHAR(30) NOT NULL DEFAULT 'Cash',
    "ReferenceCode" VARCHAR(100) NULL,
    "ReceivedByUserId" UUID NULL,
    "ReceivedByName" VARCHAR(160) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Dori-Darmon Reseptlari (Prescriptions)
CREATE TABLE "Prescriptions" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE CASCADE,
    "DoctorId" UUID NOT NULL REFERENCES "Doctors"("Id") ON DELETE RESTRICT,
    "AppointmentId" UUID NULL REFERENCES "Appointments"("Id") ON DELETE SET NULL,
    "Notes" TEXT NULL,
    "IssuedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PrescriptionItems" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "PrescriptionId" UUID NOT NULL REFERENCES "Prescriptions"("Id") ON DELETE CASCADE,
    "MedicineName" VARCHAR(200) NOT NULL,
    "Dosage" VARCHAR(100) NOT NULL,
    "Duration" VARCHAR(100) NOT NULL,
    "Instructions" TEXT NOT NULL
);

-- 16. Audit Log Jadvali
CREATE TABLE "AuditLogs" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ActorId" UUID NULL,
    "ActorEmail" VARCHAR(120) NOT NULL,
    "ActorRole" VARCHAR(50) NOT NULL,
    "Action" VARCHAR(100) NOT NULL,
    "Resource" VARCHAR(100) NOT NULL,
    "ResourceId" VARCHAR(100) NULL,
    "OldValues" JSONB NULL,
    "NewValues" JSONB NULL,
    "IpAddress" VARCHAR(45) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Success'
);
```

---

## 5. ASOSIY BIZNES MANTIQ VA ALGORITMLAR

### 5.1. Dinamik Slot Generatsiyasi va Smart Scheduling
Shifokorning ish grafigi asosida bo'sh vaqt slotlarini generatsiya qilish algoritmi quyidagi qoidalarga tayanadi:
1. **Smena Chegaralari:** Shifokorning `StartHour` (masalan, 09:00) va `EndHour` (masalan, 18:00) oraliqlari olinadi.
2. **Hafta Kuni Tekshiruvi:** Tanlangan sana shifokorning `WorkingDays` (masalan, "1,2,3,4,5,6") ro'yxatida mavjudligi tekshiriladi.
3. **Tushlik Tanaffusi (Lunch Break):** Slot `LunchStart` va `LunchEnd` (13:00 - 14:00) oralig'iga to'g'ri kelmasligi shart.
4. **Mavjud Qabullar Filtrlanishi:** Faol (Statusi `Cancelled` yoki `NoShow` bo'lmagan) barcha qabullar chiqarib tashlanadi.
5. **Qadam:** Standart qadam — 30 daqiqa.

```csharp
// Algoritmik Mantiq (C# Implementatsiyasi)
public List<TimeSlotDto> GenerateAvailableSlots(Doctor doctor, List<Appointment> existingAppointments, DateOnly targetDate)
{
    var result = new List<TimeSlotDto>();
    if (!doctor.WorksOn(targetDate.DayOfWeek)) return result;

    var currentTime = doctor.StartHour;
    var activeAppointments = existingAppointments
        .Where(a => a.Date == targetDate && a.Status != "Cancelled" && a.Status != "NoShow")
        .ToList();

    while (currentTime.AddMinutes(30) <= doctor.EndHour)
    {
        var slotStart = currentTime;
        var slotEnd = currentTime.AddMinutes(30);

        // 1. Tushlik vaqti tekshiruvi
        bool inLunch = (slotStart < doctor.LunchEnd && slotEnd > doctor.LunchStart);

        // 2. Mavjud bronlar bilan kesishish: (StartA < EndB) AND (EndA > StartB)
        bool isBooked = activeAppointments.Any(a => slotStart < a.EndTime && slotEnd > a.StartTime);

        if (!inLunch && !isBooked)
        {
            result.Add(new TimeSlotDto(slotStart.ToString("HH:mm"), slotEnd.ToString("HH:mm"), true));
        }
        currentTime = currentTime.AddMinutes(30);
    }
    return result;
}
```

---

### 5.2. Double Booking Himoyasi (2 Darajali Karantin)
Tizim ikkita foydalanuvchi bir soniyada bir xil slotni bosganda to'qnashuvni nolga tushiradi:
- **1-Daraja (Hardware/Database):** PostgreSQL `btree_gist` kengaytmasidagi `EXCLUSION CONSTRAINT` bir xil `DoctorId` va vaqt oraliqlarining kesishishiga yo'l qo'ymaydi. Shu bilan birga `BookedSlots` jadvalidagi `(DoctorId, Date, StartTime)` unikal indeksi ikkinchi tranzaksiyani bekor qiladi.
- **2-Daraja (Application / Optimistic Concurrency):** C# EF Core `DbUpdateException` (Postgres xato kodi `23P01` yoki `23505`) kelib tushganda, tranzaksiyani `ROLLBACK` qiladi va mijozga tushunarli `409 Conflict` (RFC 7807) javobini qaytaradi:
  ```json
  {
    "type": "https://errors.dentacore.uz/slot-already-booked",
    "title": "Vaqt oralig'i band qilingan",
    "status": 409,
    "detail": "Ushbu vaqt oralig'i boshqa foydalanuvchi tomonidan band qilindi. Iltimos, boshqa vaqtni tanlang."
  }
  ```

---

### 5.3. Interaktiv Tish Formulasi (FDI 11–48 Odontogram)
- **Xalqaro Standart:** FDI Two-Digit Notation (ISO 3950).
  - 1-kvadrant: Yuqori o'ng (18 dan 11 gacha).
  - 2-kvadrant: Yuqori chap (21 dan 28 gacha).
  - 3-kvadrant: Pastki chap (38 dan 31 gacha).
  - 4-kvadrant: Pastki o'ng (41 dan 48 gacha).
- **Tish Yuzalari (5 Anatomik Yuza):**
  - `Occlusal` (Chaynash yuzasi)
  - `Mesial` (Markazga qaragan old yuza)
  - `Distal` (Orqaga qaragan yuza)
  - `Buccal` (Yonoq/lab tomon yuza)
  - `Lingual` (Til/tanglay tomon yuza)
- **Klinik Holatlar (Tooth Conditions):**
  - `Healthy` (Sog'lom)
  - `Caries` (Karies)
  - `Filling` (Plomba)
  - `Crown` (Qoplama / Koronka)
  - `Endodontic` (Ildiz kanali davolangan)
  - `Implant` (Implantatsiya)
  - `Extracted` (Olingan / Yo'q tish)
- **Tarix va Audit:** Har bir tahrirlashda `ToothRecords` yangilanadi va o'sha holatning to'liq JSON nusxasi `ToothRecordHistories` jadvaliga kim tomonidan o'zgartirilganligi bilan qo'shiladi. Tarix hech qachon o'chirilmaydi.

---

### 5.4. Moliyaviy Modul, Kassa, Avans va Shifokor Ulushi (% Bonus)
1. **Hisob-Faktura Shakllanishi (Invoice):**
   - Shifokor yoki qabulxona xizmatlarni tanlaydi (`ServiceItems`).
   - Jami summa = $\sum(\text{Miqdor} \times \text{Xizmat Narxi})$.
   - Sof summa = $\text{Jami Summa} - \text{Chegirma}$.
2. **Qisman To'lov va Qarz:**
   - Bemor istalgan summani (masalan, 20% avans) to'lashi mumkin.
   - $\text{Qoldiq Qarz} = \text{Sof Summa} - \text{To'langan Summa}$.
   - Agar qoldiq > 0 bo'lsa, hisob holati `PartiallyPaid`, bemor profilidagi `TotalDebt` hisobiga qo'shiladi. To'liq to'langanda `Paid` bo'ladi.
3. **Shifokor Komissiyasi (Doctor Profit Share):**
   - Har bir shifokor profilida `ProfitSharePercent` (masalan, 30%) mavjud.
   - Shifokorning oylik daromadi formulasi:
     $$\text{Maosh} = \text{BaseSalary} + \sum (\text{Bajarilgan Xizmatlar Summasi} \times \frac{\text{ProfitSharePercent}}{100})$$
   - Super Admin barcha xodimlarning ko'rsatkichlarini ko'radi, shifokor esa faqat o'zinikini ko'radi.

---

### 5.5. Super Admin Ruxsatlar Boshqaruv Jadvali (Dynamic Permissions Matrix)

Super Admin interfeysidagi interaktiv boshqaruv jadvali arxitekturasi:
- **Jadval Ustunlari:** Tizim modullari (`Calendar`, `Billing`, `PatientsDb`, `Odontogram`, `Prescriptions`, `Staff`, `Services`, `Reports`).
- **Jadval Qatorlari:** Klinika xodimlari ro'yxati (Ismi, Roli).
- **Katakchalar (Cells):** Har bir modul kesishmasida 3 ta mustaqil checkbox bo'ladi:
  - `[ ] Ko'rish (View)`
  - `[ ] Tahrirlash (Edit)`
  - `[ ] O'chirish (Delete)`
- **Sezgir Maydonlar Toggle-Switchlari:**
  - `Bemor telefonini yashirish` (ON/OFF)
  - `Umumiy kassani yashirish` (ON/OFF)
  - `Faqat o'z oyligini ko'rsatish` (ON/OFF)

Checkbox bosilishi bilan frontend `PUT /api/v1/admin/permissions/{userId}` endpointiga so'rov jo'natadi va huquq bazaga bir zumda yoziladi.

---

## 6. API SPETSIFIKATSIYASI (RESTFUL & OPENAPI 3.1)

Barcha endpointlar `/api/v1` prefiksi ostida ishlaydi. So'rov va javoblar JSON formatida, sana va vaqtlar ISO-8601 UTC formatida yuritiladi. Xatolar RFC 7807 Problem Details standartiga mos.

### 6.1. Autentifikatsiya va Sessiya (`/api/v1/auth`)
- `POST /api/v1/auth/login`
  - **Kirish:** `{ "email": "admin@dentacore.uz", "password": "SecurePassword123!" }`
  - **Chiqish:** `{ "accessToken": "jwt...", "user": { "id": "...", "fullName": "...", "role": "SuperAdmin" } }`
  - **Xavfsizlik:** Refresh token `HttpOnly; Secure; SameSite=Strict` cookie sifatida o'rnatiladi.
- `POST /api/v1/auth/register-patient`
  - Bemorlarning telefon raqami va ismi orqali mustaqil ro'yxatdan o'tishi.
- `POST /api/v1/auth/refresh`
  - Cookie'dagi refresh token orqali yangi access token olish.
- `POST /api/v1/auth/logout`
  - Tokenni bekor qilish va cookieni tozalash.

---

### 6.2. Public Client Portal (`/api/v1/public`)
*Hech qanday token talab qilinmaydi (Anonim ochiq).*
- `GET /api/v1/public/doctors`
  - Faol shifokorlar ro'yxati (Ismi, mutaxassisligi, tajribasi, reytingi, rasmi).
- `GET /api/v1/public/services`
  - Klinika xizmatlari va narxlari preyskuranti.
- `GET /api/v1/public/slots?doctorId={id}&date={YYYY-MM-DD}`
  - Shifokorning bo'sh vaqt slotlari ro'yxati.
- `POST /api/v1/public/bookings`
  - Onlayn navbatga yozilish.
  - **Headers:** `Idempotency-Key: uuid`
  - **Kirish:**
    ```json
    {
      "doctorId": "d3b07384-d113-49d9-be1a-05a8f4c28f01",
      "serviceId": "e1f13b56-7889-42b1-93c4-98c4d12a67e2",
      "date": "2026-11-20",
      "startTime": "10:30",
      "patientName": "Aziz Rahimov",
      "patientPhone": "+998901234567",
      "notes": "Tish og'rig'i bezovta qilmoqda"
    }
    ```
  - **Javob (201 Created):** `{ "bookingId": "...", "bookingCode": "DC-7492", "status": "Pending" }`
  - **Javob (409 Conflict):** Slot band bo'lsa.

---

### 6.3. Bemor Shaxsiy Kabineti (`/api/v1/portal`)
*Faqat `Patient` roli uchun.*
- `GET /api/v1/portal/me/appointments` — Bemorning barcha bo'lajak va o'tgan qabullari.
- `GET /api/v1/portal/me/odontogram` — Bemorning tish formulasi va holatlari (faqat ko'rish).
- `GET /api/v1/portal/me/prescriptions` — Shifokor yozib bergan dori reseptlari.
- `GET /api/v1/portal/me/invoices` — To'lovlar tarixi, kvitansiyalar va qarzdorlik balansi.

---

### 6.4. Admin & Staff CRM (`/api/v1/crm`)
*Faqat tasdiqlangan xodimlar uchun (PBAC tekshiruvi bilan).*
- `GET /api/v1/crm/me/permissions` — Xodimning joriy ruxsatlari lug'ati `{ "Calendar.View": true, ... }`.
- `GET /api/v1/crm/appointments?date={date}&doctorId={id}` — Kalendar qabullari.
- `POST /api/v1/crm/appointments` — Administrator tomonidan qabul yaratish.
- `PATCH /api/v1/crm/appointments/{id}/status` — Qabul holatini o'zgartirish (`Pending` -> `Confirmed` -> `InProgress` -> `Completed` / `Cancelled`).
- `GET /api/v1/crm/patients` — Bemorlar bazasi qidiruvi (Ism yoki telefon bo'yicha).
- `GET /api/v1/crm/patients/{id}` — Bemorning to'liq tibbiy kartasi (Agar ruxsat bo'lmasa, telefon raqami niqoblanadi).
- `GET /api/v1/crm/patients/{id}/odontogram` — Bemorning tish xaritasi.
- `PUT /api/v1/crm/patients/{id}/odontogram` — Shifokor tomonidan tish holatini yangilash (Audit trail yoziladi).
- `POST /api/v1/crm/invoices` — Qabul bo'yicha hisob-faktura shakllantirish.
- `POST /api/v1/crm/invoices/{id}/payments` — To'lov qabul qilish (Avans yoki to'liq).
- `GET /api/v1/crm/me/compensation` — Shifokorning shaxsiy ish haqi va foiz hisoboti.

---

### 6.5. Super Admin Boshqaruvi (`/api/v1/admin`)
*Faqat `SuperAdmin` roli uchun.*
- `GET /api/v1/admin/staff` — Barcha xodimlar va ularning grafiklari.
- `POST /api/v1/admin/staff` — Yangi shifokor yoki administrator yaratish.
- `GET /api/v1/admin/permissions/matrix` — Barcha xodimlarning ruxsatlar matritsasi.
- `PUT /api/v1/admin/permissions/{userId}` — Xodim ruxsatlarini tahrirlash (Overrides).
- `GET /api/v1/admin/reports/financial` — Klinikaning umumiy tushumi, xarajatlar va sof foydasi.
- `GET /api/v1/admin/audit-logs` — Tizimdagi harakatlar audit jurnali.

---

## 7. REAL-VAQT KOMMUNIKATSIYA PROTOKOLI (SIGNALR HUB)

Tizim sahifani yangilamasdan (F5 bosmasdan) real vaqt rejimida yangilanishi uchun ASP.NET Core SignalR kutubxonasidan foydalanadi.

### 7.1. Hub Endpoint va Guruhlar
- **Hub URL:** `/hubs/clinic` (Ulanishda JWT Access Token so'rov sarlavhasida yoki query parameter orqali uzatiladi).
- **Guruhlar (Rooms):**
  - `ClinicStaff` — Barcha faol xodimlar.
  - `Doctor_{DoctorId}` — Aniq bir shifokorning shaxsiy xonasi.
  - `Patient_{PatientId}` — Bemorning shaxsiy bildirishnomalar xonasi.

### 7.2. Hodisalar (SignalR Events)
1. `NewAppointmentBooked`:
   - Yangi qabul yozilganda barcha administratorlar va tegishli shifokor kalendariga avtomatik yangi kartochka qo'shiladi.
   - Payload: `{ "appointmentId": "...", "doctorId": "...", "patientName": "...", "startTime": "10:30" }`
2. `AppointmentStatusChanged`:
   - Bemor navbati o'zgarganda (masalan, `InProgress` bo'lib shifokor xonasiga kirganda) barcha monitorlarda rang o'zgaradi.
   - Payload: `{ "appointmentId": "...", "newStatus": "InProgress", "updatedAt": "..." }`
3. `SlotOccupiedBroadcast`:
   - Saytda biror foydalanuvchi slotni band qilishi bilan, boshqa barcha ochiq sahifalarda ushbu vaqt tugmasi qizil bo'lib bloklanadi.
4. `OdontogramUpdated`:
   - Shifokor tish holatini saqlaganda bemor portalida va kartochkada tish rangi yangilanadi.

---

## 8. FRONTEND ARXITEKTURASI VA APPLE GLASSMORPHISM DIZAYN TIZIMI

### 8.1. Dizayn Falsafasi va Tokenlar
Interfeys **Apple macOS / iOS Human Interface Guidelines** asosida yaratilgan:
- **Shaffoflik va Glassmorphism:** Orqa fon xiralashgan (`backdrop-blur-md`), panellar nozik yarim-shaffof oq fon bilan ajratilgan.
- **Yorqinlik va Ranglar:**
  - Asosiy Rang (Accent): Zumrad / Teal (`#0F766E` yoki `#0D9488`).
  - Fon Rangi: Yumshoq neytral (`#F8FAFC`).
  - Tish Holati Ranglari:
    - Sog'lom: Oq / Och ko'k (`#F1F5F9`)
    - Karies: Qizil / Qahrabo (`#EF4444`)
    - Plomba: Ko'k (`#3B82F6`)
    - Implant: Binafsha (`#8B5CF6`)
    - Koronka: Sariq / Oltin (`#F59E0B`)
    - Olingan: Kulrang chiziq (`#94A3B8`)

### 8.2. Animatsiyalar va UX
- Har bir modal oyna, tab o'zgarishi va xabarnomalar `motion/react` orqali silliq `spring` fizikasi bilan harakatlanadi.
- Jadval va qabullar ro'yxatida holatlar yangilanganda miltillashlarsiz animatsiya qo'llaniladi.

---

## 9. XAVFSIZLIK, TIBBIY MAXFIYLIK (HIPAA/GDPR) VA AUDIT QOIDALARI

1. **Deny by Default:** Barcha API yo'llari yopiq. Ruxsat beruvchi policy bo'lmasa, avtomatik `403 Forbidden` qaytadi.
2. **Parollar Xavfsizligi:** Parollar BCrypt (WorkFactor: 11) orqali xeshlanadi. Hech qachon ochiq saqlanmaydi.
3. **Sezgir Ma'lumotlarni Niqoblash (Data Masking):**
   - Agar shifokorga bemor telefonini ko'rish ruxsati berilmagan bo'lsa, backend DTO transformatsiyasida telefon raqami `+998 90 *** ** 45` shaklida uzatiladi.
4. **Audit Trail (O'zgarmas Jurnal):**
   - Tish holatining o'zgarishi, to'lov qabul qilinishi va ruxsatlar o'zgarishi `AuditLogs` jadvaliga yoziladi.
   - Jurnaldan yozuvlarni o'chirish (DELETE) texnik jihatdan taqiqlanadi.
5. **CSRF va XSS Himoyasi:**
   - JWT access token faqat xotirada (React State) saqlanadi. `localStorage` ga yozilmaydi.
   - Refresh token esa faqat `HttpOnly` cookie orqali uzatiladi.

---

## 10. NOFUNKSIONAL TALABLAR (NFR)

- **Performance (Tezlik):**
  - Bo'sh slotlarni hisoblash so'rovi (`GET /public/slots`) 50 ms dan kam vaqtda javob berishi shart.
  - Tizim bir vaqtning o'zida 1000+ aktiv foydalanuvchi sessiyasini ushlab tura olishi kerak.
- **Availability (Ishonchlilik):**
  - 99.9% uptime. PostgreSQL har soatlik avtomatik backup qilinadi.
- **Data Integrity (Ma'lumotlar Butunligi):**
  - Hech qanday sharoitda bir xil shifokorga bir vaqtda ikkita qabul yozilishi mumkin emas (PostgreSQL Exclusion Constraint).

---

## 11. AI DASTURCHI AGENTLAR UCHUN KO'RSATMA (IMPLEMENTATION GUIDE)

Agar siz ushbu hujjatni **Cursor, Windsurf, Claude Code, GitHub Copilot** yoki boshqa AI dasturchiga taqdim etayotgan bo'lsangiz, quyidagi qadamlar ketma-ketligida kod generatsiyasini talab qiling:

1. **1-Qadam (Database & Migrations):**
   - 4-bo'limdagi SQL DDL skriptini PostgreSQL 16 da ishga tushiring. `btree_gist` kengaytmasi va `Appointments` jadvalidagi `EXCLUDE` constraint to'g'ri o'rnatilganini tekshiring.
2. **2-Qadam (Backend Core & Concurrency):**
   - C# ASP.NET Core 8 loyihasida Clean Architecture qatlamlarini sozlang.
   - `SlotCalculationEngine` va `DoubleBookingGuard` sinflarini yozing. `DbUpdateException` ushlanib, `409 Conflict` chiqarilishini kafolatlang.
3. **3-Qadam (Dynamic RBAC Middleware):**
   - `PermissionAuthorizationHandler` yarating. Har bir so'rovda `UserPermissions` jadvalidan shaxsiy huquqlarni tekshiring.
4. **4-Qadam (FDI Odontogram & Billing Logic):**
   - 11 dan 48 gacha bo'lgan tishlar uchun JSONB bilan ishlovchi controller va servicelarni yozing.
   - Kassa to'lovlarida qisman to'lov (avans) va shifokor komissiyasi formulalarini tekshiring.
5. **5-Qadam (SignalR Real-Time Hub):**
   - `/hubs/clinic` hubini ulang. Qabul yaratilganda va status o'zgarganda xabarlarni guruhlarga yuboring.
6. **6-Qadam (Frontend Apple Glassmorphism):**
   - React 19 va Tailwind CSS yordamida interfeysni quring. Bemor portali va Admin CRM interfeyslarini qat'iy alohida saqlang. Tish formulasini SVG vektorlar bilan render qiling.

---
*Ushbu Texnik Topshiriq DentaCore platformasining to'liq va rasmiy spetsifikatsiyasi hisoblanadi.*
