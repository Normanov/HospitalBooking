# DentaCore — Software Requirements & Architecture Specification

> **Eslatma:** Ushbu loyihaning to'liq, xalqaro ISO/IEC/IEEE 29148 standarti bo'yicha yozilgan master texnik topshirig'i (SRS) [DENTACORE_SRS_MASTER.md](file:///c:/Users/user/Downloads/Hospital/DENTACORE_SRS_MASTER.md) faylida to'liq keltirilgan.

**Versiya:** 2.0 (Production-Ready Spec)  
**Texnologiyalar:** C# ASP.NET Core 8, Clean Architecture, MediatR, FluentValidation, EF Core 8, PostgreSQL 16 (`btree_gist`), React 19, TypeScript, Tailwind CSS v4, Motion, TanStack Query, SignalR.

---

## 1. Asosiy Yo'nalishlar va Arxitektura

Tizim ikkita tubdan mustaqil interfeysdan iborat:
1. **Public Client Portal (Bemorlar uchun):**
   - Hech qanday murakkab menyularsiz, Apple macOS Glassmorphism dizaynida qurilgan.
   - Bemorlar shifokorlar va xizmatlarni ko'radi, 30 daqiqalik bo'sh vaqt slotlarini tanlaydi va onlayn navbatga yoziladi.
   - Shaxsiy kabinetida o'z qabullari, shifokor yozgan reseptlar, o'z tishlarining holati xaritasi va to'lov/qarz tarixini kuzatadi.
2. **Secure Admin CRM (Shifokor va Xodimlar uchun):**
   - JWT autentifikatsiyasi va dinamik huquqlar (PBAC) bilan himoyalangan boshqaruv paneli.
   - Kalendar, navbat holatlari, interaktiv FDI 11–48 tish formulasi (Odontogram), kassa (avans, qoldiq qarz, shifokor ulushi) va Super Admin ruxsatlar boshqaruv jadvali.

---

## 2. Dynamic RBAC / PBAC Matritsasi

Ruxsatlar server tomonidan qat'iy tekshiriladi (`Deny by Default`):
- `SuperAdmin`: Tizimning to'liq egasi. Barcha shifokorlar, qabullar, kassa va moliyaviy hisobotlarni ko'radi. Xodimlarga shaxsiy ruxsatlarni (Overrides) beradi.
- `Doctor`: Faqat o'z ish grafigi va o'ziga biriktirilgan bemorlarni ko'radi. Odontogramma va tibbiy xulosalarni to'ldiradi. Umumiy kassani ko'ra olmaydi.
- `Receptionist`: Barcha shifokorlar kalendarini ko'radi, bemorlarni yozadi, to'lovlarni qabul qiladi. Tibbiy xulosalar va tish formulasini o'zgartira olmaydi.
- `Patient`: Faqat o'ziga tegishli ma'lumotlarni ko'radi.

### Maxsus cheklovlar (Sensitive Field Masks):
- `SensitiveFields.CanViewPatientPhone` — Shifokordan bemor telefon raqamini yashirish.
- `SensitiveFields.CanViewTotalCashbox` — Administratorga umumiy kunlik kassa tushumini yashirish.
- `SensitiveFields.CanViewOwnSalaryOnly` — Shifokor faqat o'zining shaxsiy foiz/maosh hisobotini ko'ra olishi.

---

## 3. Double Booking va Concurrency Himoyasi

1. **PostgreSQL Darajasida:** `btree_gist` kengaytmasidagi `EXCLUSION CONSTRAINT` orqali shifokorning vaqt oraliqlari (`tsrange`) kesishishini bazaning apparat darajasida taqiqlash.
2. **EF Core Darajasida:** `DbUpdateException` va Postgres xato kodi `23P01` ushlanib, foydalanuvchiga `409 Conflict` qaytariladi.

---

## 4. Xalqaro Tish Formulasi (FDI 11–48 Odontogram)

- FDI Two-Digit Notation (ISO 3950) bo'yicha 32 ta doimiy tish.
- 5 ta anatomik yuza: `Occlusal`, `Mesial`, `Distal`, `Buccal`, `Lingual`.
- 7 xil klinik holat: `Healthy`, `Caries`, `Filling`, `Crown`, `Endodontic`, `Implant`, `Extracted`.
- Har bir o'zgarish `ToothRecordHistories` jadvaliga JSONB snapshot ko'rinishida muallifi bilan saqlanadi.

---

## 5. SignalR Real-Time Protokoli

- Hub: `/hubs/clinic`
- Hodisalar: `NewAppointmentBooked`, `AppointmentStatusChanged`, `SlotOccupiedBroadcast`, `OdontogramUpdated`.

---

> Barcha batafsil DDL jadvallar, API endpointlarining to'liq JSON kontraktlari, C# kod namunalari va AI dasturchi agentlar uchun ko'rsatmalar [DENTACORE_SRS_MASTER.md](file:///c:/Users/user/Downloads/Hospital/DENTACORE_SRS_MASTER.md) faylida keltirilgan.
