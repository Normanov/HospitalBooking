# DentaCore CRM — Tizim Arxitekturasi va Texnik Topshiriq (SRS)
**Smart Clinic & Dental Practice Management SaaS with Real-Time Online Booking**

* **Versiya:** 1.0.0-MVP (Production-Ready Spec)
* **Muallif:** Principal Software Architect & Enterprise Healthcare Systems Designer
* **Mo'ljallangan ishlab chiquvchi agentlar:** Cursor, Cline, Claude Code, GitHub Copilot
* **Ijro muddati:** 72 soat (3 kunlik solo-sprint)
* **Maqsad:** 1 kishi 3 kun ichida to'liq ishga tushirishi mumkin bo'lgan, monolit-modular, yuqori yuklamalarga chidamli, tibbiy talablarga javob beruvchi va konversiyasi yuqori bo'lgan Smart Dental CRM platformasi.

---

## 1. TIZIM ARXITEKTURASI VA DIZAYN (SYSTEM ARCHITECTURE & DESIGN)

### 1.1. High-Level Architecture Diagram (ASCII)

```text
+---------------------------------------------------------------------------------------------------------+
|                                              CLIENT TIER                                                |
|                                                                                                         |
|   +------------------------------------+             +----------------------------------------------+   |
|   |   Public Online Booking Portal     |             |      Clinic Staff CRM / Doctor Portal        |   |
|   |  (Bemorlar uchun Mobil/Web Wizard) |             |       (Admin / Resepshn / Shifokor / Kassa)  |   |
|   |   - React 19 + Tailwind CSS        |             |   - React 19 + TanStack Query + FullCalendar |   |
|   |   - TanStack Query v5              |             |   - Interactive FDI 11-48 Odontogram (SVG)   |   |
|   +-----------------+------------------+             +----------------------+-----------------------+   |
+---------------------|-------------------------------------------------------|---------------------------+
                      | HTTPS (REST API)                                      | HTTPS (REST) + WSS (SignalR)
                      v                                                       v
+---------------------------------------------------------------------------------------------------------+
|                                    APPLICATION GATEWAY / REVERSE PROXY                                  |
|                                  Nginx / Cloudflare (SSL, Gzip/Brotli)                                  |
+-------------------------------------------------+-------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------------+
|                                      ASP.NET CORE 8 WEB API HOST                                        |
|                                                                                                         |
|  +---------------------------------------------------------------------------------------------------+  |
|  | Middleware Pipeline:                                                                              |  |
|  | [Global Exception Handler (RFC 7807)] -> [CORS] -> [Rate Limiter] -> [JWT Auth] -> [Audit Logger] |  |
|  +---------------------------------------------------------------------------------------------------+  |
|                                                                                                         |
|  +--------------------------------------+            +-----------------------------------------------+  |
|  |     REST Controllers (WebAPI)        |            |         SignalR Real-Time Hubs                |  |
|  | - /api/v1/public/booking             |            | - ClinicHub: /hubs/clinic                     |  |
|  | - /api/v1/crm/appointments           |            |   * Broadcast: AppointmentStatusChanged       |  |
|  | - /api/v1/crm/patients & odontogram  |            |   * Broadcast: NewOnlineBookingCreated        |  |
|  | - /api/v1/crm/billing & payments     |            |   * Room-based: DoctorQueue_{DoctorId}        |  |
|  +------------------+-------------------+            +-----------------------+-----------------------+  |
|                     |                                                        |                          |
|                     v                                                        |                          |
|  +-----------------------------------------------------------------------+   |                          |
|  |                   Application Core (CQRS & MediatR)                   |   |                          |
|  |  - Commands & Queries (CreateAppointment, ChangeStatus, ProcessPay)   |   |                          |
|  |  - Pipeline Behaviors: ValidationBehavior (FluentValidation)          |   |                          |
|  |  - Core Domain Services:                                              |   |                          |
|  |    * SlotCalculationEngine (Dynamic 30-min available time slots)      |   |                          |
|  |    * DoubleBookingGuard (Isolation Level + DB Constraint handler)     |   |                          |
|  |    * OdontogramStateManager (FDI 11-48 JSONB delta calculator)        |   |                          |
|  |    * PatientDeduplicationService (Phone +998 matcher)                 |   |                          |
|  +--------------------------------------+--------------------------------+   |                          |
|                                         |                                    |                          |
|                                         v                                    |                          |
|  +-----------------------------------------------------------------------+   |                          |
|  |               Infrastructure Tier (Persistence & External)            |   |                          |
|  |  - EF Core 8 (Npgsql Provider) with Dapper for High-Perf Slot Queries |   |                          |
|  |  - AppDbContext (AuditableEntity interceptor, JSONB value converters) |   |                          |
|  |  - SmsNotificationService (Eskiz / PlayMobile SMS Gateway adapter)    |   |                          |
|  +--------------------------------------+--------------------------------+   |                          |
+-----------------------------------------|------------------------------------|--------------------------+
                                          |                                    |
                                          v                                    v
+---------------------------------------------------------------------------------------------------------+
|                                         PERSISTENCE STORAGE TIER                                        |
|                                                                                                         |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                                  PostgreSQL 16 (Relational DB)                                  |   |
|   |  - Extensions: `btree_gist` (Range types & Exclusion Constraints for zero-collision booking)    |   |
|   |  - Tables: Users, DoctorSchedules, Patients, Appointments, TreatmentRecords, Invoices, Payments |   |
|   |  - Odontogram Storage: JSONB column with GIN index for tooth-state fast queries                 |   |
|   |  - Concurrency: `xmin` system column / `concurrency_token` (Optimistic Locking)                 |   |
|   +-------------------------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------------+
```

---

### 1.2. Clean Architecture Folder Structure (Backend - ASP.NET Core 8)

Loyiha to'liq Microsoft Clean Architecture and Feature Slices tamoyillari asosida tashkil etiladi:

```text
DentaCore/
│
├── src/
│   ├── DentaCore.Domain/                          # Nolga teng tashqi bog'liqlik (POCO entitylar)
│   │   ├── Common/
│   │   │   ├── BaseEntity.cs                      # Id, CreatedAtUtc, UpdatedAtUtc, IsDeleted
│   │   │   ├── IAuditableEntity.cs
│   │   │   └── Result.cs                          # Functional Result Pattern (Result<T>)
│   │   ├── Entities/
│   │   │   ├── User.cs                            # Xodimlar, shifokorlar, adminlar
│   │   │   ├── DoctorSchedule.cs                  # Ish kunlari, smena va tushlik vaqti
│   │   │   ├── Patient.cs                         # Bemor shaxsiy ma'lumotlari (+998 phone unikal)
│   │   │   ├── Appointment.cs                     # Qabul: TimeSlot, DoctorId, PatientId, Status
│   │   │   ├── ServiceItem.cs                     # Xizmatlar preyskuranti (narx, davomiylik)
│   │   │   ├── TreatmentRecord.cs                 # Anamnez, tashxis, JSONB Odontogram
│   │   │   ├── Invoice.cs                         # Hisob-faktura (Jami, Chegirma, To'langan, Qarz)
│   │   │   └── Payment.cs                         # Naqd, Karta, Click, Payme tranzaksiyalari
│   │   ├── Enums/
│   │   │   ├── UserRole.cs                        # ClinicAdmin, Receptionist, Doctor
│   │   │   ├── AppointmentStatus.cs               # Pending, Confirmed, InProgress, Completed, Cancelled, NoShow
│   │   │   ├── ToothCondition.cs                  # Healthy, Caries, Filling, Crown, Endodontic, Implant, Extracted
│   │   │   ├── PaymentMethod.cs                   # Cash, UzcardHumo, Click, Payme, BankTransfer
│   │   │   └── InvoiceStatus.cs                   # Draft, Unpaid, PartiallyPaid, Paid, Cancelled
│   │   └── ValueObjects/
│   │       ├── PhoneNumber.cs                     # +998XXXXXXXXX formatini kafolatlovchi VO
│   │       ├── TimeRange.cs                       # StartTime, EndTime, Davomiylik (TimeSpan)
│   │       └── ToothState.cs                      # Tish raqami (11-48), holat, yuzalar (MODBL)
│   │
│   ├── DentaCore.Application/                     # Biznes qoidalar, CQRS, Use Caselar
│   │   ├── Common/
│   │   │   ├── Behaviors/
│   │   │   │   ├── ValidationBehavior.cs          # MediatR validation pipeline
│   │   │   │   └── LoggingBehavior.cs             # Performance & Error logging
│   │   │   ├── Exceptions/
│   │   │   │   ├── ConflictException.cs           # Double booking xatolarida 409 chiqarish
│   │   │   │   ├── NotFoundException.cs           # 404
│   │   │   │   └── ValidationException.cs         # 400
│   │   │   └── Interfaces/
│   │   │       ├── IAppDbContext.cs
│   │   │       ├── ICurrentUserService.cs
│   │   │       ├── ISignalRHubService.cs
│   │   │       └── ISmsNotificationService.cs
│   │   ├── Features/
│   │   │   ├── Appointments/
│   │   │   │   ├── Commands/
│   │   │   │   │   ├── BookAppointmentCommand.cs
│   │   │   │   │   ├── ChangeAppointmentStatusCommand.cs
│   │   │   │   │   └── RescheduleAppointmentCommand.cs
│   │   │   │   └── Queries/
│   │   │   │       ├── GetDoctorAppointmentsQuery.cs
│   │   │   │       └── GetAvailableSlotsQuery.cs   # Dinamik bo'sh vaqt slotlari hisobi
│   │   │   ├── Patients/
│   │   │   │   ├── Commands/
│   │   │   │   │   └── CreateOrUpdatePatientCommand.cs
│   │   │   │   └── Queries/
│   │   │   │       ├── GetPatientByIdQuery.cs
│   │   │   │       └── SearchPatientsQuery.cs
│   │   │   ├── Odontogram/
│   │   │   │   ├── Commands/
│   │   │   │   │   └── SaveOdontogramSnapshotCommand.cs
│   │   │   │   └── Queries/
│   │   │   │       └── GetPatientOdontogramHistoryQuery.cs
│   │   │   └── Billing/
│   │   │       ├── Commands/
│   │   │       │   ├── CreateInvoiceCommand.cs
│   │   │       │   └── RecordPaymentCommand.cs
│   │   │       └── Queries/
│   │   │           ├── GetDailyCashReportQuery.cs
│   │   │           └── GetPatientDebtListQuery.cs
│   │   └── Services/
│   │       └── SlotCalculationEngine.cs           # 30 minutlik bo'sh vaqt hisoblash mexanizmi
│   │
│   ├── DentaCore.Infrastructure/                  # EF Core, DB Migrations, Tashqi Servislar
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Configurations/                    # Fluent API Entity konfiguratsiyalari
│   │   │   │   ├── AppointmentConfiguration.cs    # Exclusion constraint & Indekslar
│   │   │   │   ├── DoctorScheduleConfiguration.cs
│   │   │   │   ├── PatientConfiguration.cs
│   │   │   │   └── TreatmentRecordConfiguration.cs # JSONB column mapping
│   │   │   └── Migrations/
│   │   ├── RealTime/
│   │   │   ├── Hubs/ClinicHub.cs                  # SignalR Hub
│   │   │   └── SignalRHubService.cs               # ISignalRHubService implementatsiyasi
│   │   ├── Services/
│   │   │   ├── EskizSmsService.cs                 # SMS shlyuz (Uzbekistan)
│   │   │   └── DateTimeProvider.cs
│   │   └── Authentication/
│   │       └── JwtTokenGenerator.cs
│   │
│   └── DentaCore.WebAPI/                          # Entry point, Middleware, Controllers
│       ├── Controllers/
│       │   ├── BaseApiController.cs
│       │   ├── PublicBookingController.cs         # Hech qanday auth talab qilmaydigan portal
│       │   ├── AppointmentsController.cs          # RBAC: Receptionist, Doctor, Admin
│       │   ├── PatientsController.cs
│       │   ├── OdontogramController.cs
│       │   ├── BillingController.cs
│       │   └── AnalyticsController.cs             # Faqat ClinicAdmin uchun
│       ├── Middleware/
│       │   ├── ExceptionHandlingMiddleware.cs     # RFC 7807 ProblemDetails
│       │   └── RateLimitingExtensions.cs          # Public booking brute-force & spam filter
│       ├── Program.cs
│       └── appsettings.json
│
├── tests/
│   ├── DentaCore.UnitTests/                       # SlotCalculationEngine & Odontogram testlari
│   └── DentaCore.IntegrationTests/                # Concurrency & DoubleBooking testlari
│
└── docker-compose.yml                             # PostgreSQL, API, Frontend
```

---

### 1.3. Concurrency va Locking Strategiyasi (Double Booking Muammosini Hal Qilish)

Sog'liqni saqlash va bron tizimlarida eng xavfli holat — bir vaqtning o'zida ikkita mijoz (yoki administrator va onlayn bemor) bitta shifokorning bir xil vaqtiga (`14:00 - 14:30`) yozilib qolishi (**Double Booking**).

DentaCore CRM buni **2 darajali mudofaa devori** bilan kafolatlaydi:

#### 1-daraja: PostgreSQL `EXCLUSION CONSTRAINT` (Bazaning o'zida apparat darajasida bloklash)
PostgreSQL `btree_gist` kengaytmasidan foydalanib, bitta shifokor uchun vaqt oraliqlari (`tsrange`) kesishishini bazaning fizik qoidasi darajasida taqiqlaymiz:

```sql
-- PostgreSQL 16 Migration Script:
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointments"
ADD CONSTRAINT "no_overlapping_appointments_for_doctor"
EXCLUDE USING gist (
    "DoctorId" WITH =,
    tsrange("StartTimeUtc", "EndTimeUtc", '[)') WITH &&
)
WHERE ("Status" NOT IN ('Cancelled', 'NoShow'));
```
*Izoh:* Agar qabul holati `Cancelled` yoki `NoShow` bo'lsa, ushbu vaqt avtomatik tarzda bo'shatiladi va boshqa bemor ushbu vaqtga yozilishi mumkin. Agar bir vaqtda ikkita tranzaksiya bitta shifokorga yozilishga urinsa, PostgreSQL darhol `23P01 (exclusion_violation)` xatosini qaytaradi.

#### 2-daraja: C# EF Core darajasida tranzaksiya va Optimistic Concurrency
C# Application qatlamida tranzaksiya `IsolationLevel.Serializable` yoki `RepeatableRead` darajasida boshqariladi va `DbUpdateException` ushlanib, foydalanuvchiga 409 Conflict qaytariladi:

```csharp
public async Task<Result<Guid>> Handle(BookAppointmentCommand command, CancellationToken ct)
{
    // 1. Shifokor jadvali va tanaffuslarini tekshirish
    var isWorkingHour = await _slotEngine.IsWithinWorkingHoursAsync(
        command.DoctorId, command.StartTimeUtc, command.EndTimeUtc, ct);
    
    if (!isWorkingHour)
        return Result<Guid>.Failure("Tanlangan vaqt shifokorning ish grafigiga to'g'ri kelmaydi.");

    // 2. Bemor telefon raqami bo'yicha dublikatni oldini olish (Idempotent Bemor)
    var patient = await _patientService.GetOrCreatePatientAsync(
        command.FullName, command.PhoneNumber, ct);

    // 3. Appointment yaratish
    var appointment = new Appointment(
        doctorId: command.DoctorId,
        patientId: patient.Id,
        serviceId: command.ServiceId,
        startTimeUtc: command.StartTimeUtc,
        endTimeUtc: command.EndTimeUtc,
        notes: command.Notes,
        status: AppointmentStatus.Pending
    );

    try
    {
        _dbContext.Appointments.Add(appointment);
        await _dbContext.SaveChangesAsync(ct);

        // 4. SignalR orqali barcha xodimlarni real-time ogohlantirish
        await _signalRService.BroadcastNewAppointmentAsync(appointment, ct);

        return Result<Guid>.Success(appointment.Id);
    }
    catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23P01")
    {
        // Exclusion constraint buzildi - demak soniyaning 1/1000 ulushida kimdir ushbu vaqtni band qildi!
        throw new ConflictException("Ushbu vaqt oralig'i hozirgina boshqa bemor tomonidan band qilindi. Iltimos, boshqa vaqtni tanlang.");
    }
}
```

---

### 1.4. Frontend Feature-Based Arxitekturasi

Frontend kodi texnik qatlamlar bo'yicha emas, balki biznes funksiyalar (Feature-Sliced Design g'oyasi) asosida modulli ajratiladi:

```text
frontend/src/
├── app/
│   ├── providers/                 # TanStack Query, AuthProvider, SignalRProvider
│   ├── routes/                    # Public vs Protected Dashboard router
│   └── store/                     # Global session & clinic state
├── assets/                        # SVG tish ikonkalari, logotiplar
├── components/ui/                 # Atomik komponentlar (Button, Dialog, Input, Badge, Table)
├── features/
│   ├── appointments/              # Kalendar grid, drag-n-drop qabullar, statusni o'zgartirish
│   │   ├── api/                   # useAppointments, useChangeStatus mutation
│   │   ├── components/            # CalendarGrid, AppointmentCard, QuickBookingModal
│   │   └── types/                 # AppointmentDto, CalendarViewType
│   ├── patients/                  # Bemorlar ro'yxati, qidiruv, EMR karta
│   │   ├── api/                   # usePatients, usePatientDetails
│   │   └── components/            # PatientTable, PatientHistoryDrawer, MedicalCard
│   ├── odontogram/                # Interaktiv Tish Formulasi (FDI 11-48)
│   │   ├── api/                   # useOdontogram, useUpdateToothMutation
│   │   ├── components/            # OdontogramView, ToothVector, SurfaceSelector, TreatmentLegend
│   │   ├── hooks/                 # useToothHistory, useFdiCalculations
│   │   └── types/                 # ToothModel, SurfaceType, ConditionType
│   ├── billing/                   # Kassa, hisob-faktura, qisman to'lov, qarzlar
│   │   ├── api/                   # useInvoices, useAddPaymentMutation, useCashReport
│   │   └── components/            # InvoiceCreator, PaymentModal, DebtLedger, RevenueChart
│   └── public-booking/            # Bemorlar uchun 3 qadamli onlayn wizard
│       ├── components/            # Step1DoctorService, Step2DateTimeSlot, Step3PatientInfo
│       └── hooks/                 # useAvailableSlots, usePublicBookingWizard
├── shared/
│   ├── hooks/                     # useDebounce, useSignalRQueue
│   └── utils/                     # phoneFormatter (+998), currencyFormatter (UZS), dateHelper
└── types/
```

---

## 2. ROLLAR VA RUXSATLAR MATRITSASI (RBAC)

DentaCore CRM da 4 ta asosiy rol mavjud:
1. **ClinicAdmin**: Klinika egasi yoki bosh shifokor. Tizimdagi hamma narsani ko'rish, xodimlar yaratish, moliyaviy hisobotlar va narxlarni boshqarish huquqiga ega.
2. **Receptionist (Registratura)**: Bemorlarni kutib oluvchi va ro'yxatga oluvchi xodim. Kalendarni boshqarish, navbat holatini yangilash, kassa to'lovlarini qabul qilish va bemorlar bazasini yuritish huquqiga ega.
3. **Doctor (Shifokor)**: O'zining qabullar ro'yxatini ko'rish, qabul holatini `InProgress` / `Completed` ga o'tkazish, Odontogram (tish formulasi) ga tashxis kiritish va ko'rsatilgan xizmatlar chekini shakllantirish huquqiga ega. Begona shifokor bemorini tahrirlay olmaydi.
4. **PublicPatient (Anonim onlayn bemor)**: Faqat klinika shifokorlari ro'yxatini ko'rish, bo'sh slotlarni olish va telefon raqami orqali o'ziga qabul yaratish huquqi (Read & Book only).

### RBAC Ruxsatlar Matritsasi

| Modul / Amal | ClinicAdmin | Receptionist | Doctor | PublicPatient |
| :--- | :---: | :---: | :---: | :---: |
| **Shifokorlar va Bo'sh slotlarni ko'rish** | TO'LIQ | TO'LIQ | TO'LIQ | FAQAT BO'SH SLOTLAR |
| **Onlayn qabulga yozilish (Create Appointment)** | TO'LIQ | TO'LIQ | TO'LIQ | FAQAT O'ZIGA |
| **Qabul holatini o'zgartirish (Pending -> Confirmed)** | TO'LIQ | TO'LIQ | CHEKLANGAN | YO'Q |
| **Qabulni o'tkazish (InProgress -> Completed)** | TO'LIQ | TO'LIQ | FAQAT O'ZINING | YO'Q |
| **Tish Formulasi (Odontogram) ni tahrirlash** | TO'LIQ | YO'Q | FAQAT O'Z BEMORI | YO'Q |
| **Bemorning EMR tarixini ko'rish** | TO'LIQ | ASOSIY | TO'LIQ | YO'Q |
| **Kassa / To'lov qabul qilish (Payments)** | TO'LIQ | TO'LIQ | KO'RISH (O'Z CHEKI) | YO'Q |
| **Moliyaviy tahlil va Sof tushum (Analytics)** | TO'LIQ | YO'Q | YO'Q | YO'Q |
| **Xizmatlar preyskurantini o'zgartirish** | TO'LIQ | YO'Q | YO'Q | YO'Q |
| **Shifokorlar ish jadvalini belgilash** | TO'LIQ | CHEKLANGAN | YO'Q | YO'Q |

---

## 3. FUNKSIONAL VA NOFUNKSIONAL TALABLAR

### 3.1. 3 Kunlik MVP Scope va Out-of-Scope Chegaralari

| Bo'lim | 3 Kunlik MVP ga KIRADI (In-Scope) | Keyingi Bosqichga QOLDIRILADI (Out-of-Scope) |
| :--- | :--- | :--- |
| **Onlayn Navbat** | Mobil moslashuvchan 3 qadamli wizard, +998 tekshiruvi, real vaqtda bo'sh slotlar | SMS orqali OTP kod yuborib telefonni 100% verifikatsiya qilish |
| **Kalendar** | Kunlik/Haftalik Grid, statuslar (Kutmoqda, Qabulda, Yakunlandi), 30 daqiqalik intervallar | Google Calendar 2-tomonlama sinxronizatsiyasi |
| **Tish Formulasi** | FDI 11-48 to'liq 32 ta tish, 7 xil holat (Karies, Plomba, Implant va h.k.), JSONB saqlash | 3D tish modeli renderlash (Three.js) |
| **Moliya** | Xizmat qo'shish, hisob chiqarish, qisman to'lov (avans), qarzdorlik balansi | Click/Payme avtomatlashtirilgan fiskal chek integratsiyasi |
| **Real-Time** | SignalR orqali kalendarda yangi buyurtma paydo bo'lishi va status o'zgarishi | WebRTC orqali shifokor va bemor o'rtasida video-konsultatsiya |
| **Xavfsizlik** | JWT Auth, Exclusion Constraint double-booking himoyasi, IP Rate Limiter | Biometrik FaceID yoki barmoq izi orqali kirish |

---

### 3.2. Smart Scheduling Engine (Bo'sh Vaqt Slotlarini Hisoblash Algoritmi)

Har bir shifokorning o'z ish vaqti (masalan: `09:00 - 18:00`), tushlik tanaffusi (`13:00 - 14:00`) va mavjud band qilingan qabullari bo'ladi.
Algoritm 30 minutlik qadam bilan barcha mumkin bo'lgan slotlarni generatsiya qiladi va band oraliqlarni filtrlaydi.

```csharp
// Application/Services/SlotCalculationEngine.cs
public class SlotCalculationEngine
{
    public List<TimeSlotDto> CalculateAvailableSlots(
        DoctorSchedule schedule,
        List<Appointment> existingAppointments,
        DateOnly date,
        int slotDurationMinutes = 30)
    {
        var availableSlots = new List<TimeSlotDto>();
        
        // 1. Agar shifokor ushbu kunda ishlamasa, bo'sh ro'yxat qaytarish
        if (!schedule.IsWorkingDay(date.DayOfWeek))
            return availableSlots;

        var shiftStart = date.ToDateTime(schedule.StartTime);
        var shiftEnd = date.ToDateTime(schedule.EndTime);
        var lunchStart = date.ToDateTime(schedule.LunchStartTime);
        var lunchEnd = date.ToDateTime(schedule.LunchEndTime);

        // Faol (bekor qilinmagan) qabullarni saralab olish
        var activeAppointments = existingAppointments
            .Where(a => a.Status != AppointmentStatus.Cancelled && a.Status != AppointmentStatus.NoShow)
            .OrderBy(a => a.StartTimeUtc)
            .ToList();

        var currentPointer = shiftStart;

        while (currentPointer.AddMinutes(slotDurationMinutes) <= shiftEnd)
        {
            var slotEnd = currentPointer.AddMinutes(slotDurationMinutes);

            // Tushlik vaqtiga to'g'ri kelmasligini tekshirish
            bool isDuringLunch = (currentPointer < lunchEnd) && (slotEnd > lunchStart);

            // Mavjud qabullar bilan kesishmasligini tekshirish: (StartA < EndB) AND (EndA > StartB)
            bool isOverlapping = activeAppointments.Any(app => 
                currentPointer < app.EndTimeUtc && slotEnd > app.StartTimeUtc);

            // O'tib ketgan vaqtni (o'tmishni) ko'rsatmaslik
            bool isPast = currentPointer <= DateTime.UtcNow;

            if (!isDuringLunch && !isOverlapping && !isPast)
            {
                availableSlots.Add(new TimeSlotDto
                {
                    StartTime = currentPointer,
                    EndTime = slotEnd,
                    FormattedTime = $"{currentPointer:HH:mm} - {slotEnd:HH:mm}",
                    IsAvailable = true
                });
            }

            currentPointer = currentPointer.AddMinutes(slotDurationMinutes);
        }

        return availableSlots;
    }
}
```

---

### 3.3. Bemor EMR va Interaktiv Tish Formulasi (FDI 11–48 Standarti)

DentaCore CRM xalqaro **FDI World Dental Federation Two-Digit Notation** tizimidan foydalanadi:
* **1-kvadrant (Yuqori o'ng):** 18, 17, 16, 15, 14, 13, 12, 11
* **2-kvadrant (Yuqori chap):** 21, 22, 23, 24, 25, 26, 27, 28
* **3-kvadrant (Pastki chap):** 38, 37, 36, 35, 34, 33, 32, 31
* **4-kvadrant (Pastki o'ng):** 41, 42, 43, 44, 45, 46, 47, 48

Har bir tish 5 ta yuzadan (Surfaces: `Occlusal/Incisal`, `Mesial`, `Distal`, `Buccal/Vestibular`, `Lingual/Palatal`) iborat.

#### Odontogram JSONB Ma'lumotlar Tuzilishi (PostgreSQL `TreatmentRecords.OdontogramData` ustuni):
```json
{
  "updatedAt": "2026-11-12T10:30:00Z",
  "updatedByDoctorId": "d3b07384-d113-4a44-a15d-0d6d5ef0b921",
  "teeth": {
    "16": {
      "condition": "Caries",
      "surfaces": ["Occlusal", "Distal"],
      "diagnosis": "Chuqur karies",
      "treatmentPlan": "Kompozit plomba o'rnatish",
      "cost": 350000.00
    },
    "24": {
      "condition": "Crown",
      "surfaces": ["All"],
      "diagnosis": "Zirkon qoplama",
      "treatmentPlan": "Yakunlangan",
      "cost": 1200000.00
    },
    "36": {
      "condition": "Extracted",
      "surfaces": [],
      "diagnosis": "Ildiz asoratlari sabab olingan",
      "treatmentPlan": "Implant rejalashtirilmoqda",
      "cost": 0.00
    },
    "46": {
      "condition": "Implant",
      "surfaces": [],
      "diagnosis": "Straumann implant o'rnatilgan",
      "treatmentPlan": "Abatment va toj kutilmoqda",
      "cost": 4500000.00
    }
  }
}
```

---

### 3.4. Moliya va Kassa Moduli (Billing & Debt Service)

* **Ko'rsatilgan xizmatlar kalkulyatsiyasi:** Shifokor davolashni yakunlaganida (`Status = Completed`), davolangan tishlar va qilingan muolajalar asosida avtomatik hisob-faktura (`Invoice`) shakllanadi.
* **Qisman to'lov (Avans) va Qarzdorlik:**
  $$\text{Debt} = \text{TotalAmount} - \text{DiscountAmount} - \sum(\text{PaidAmounts})$$
  Agar bemor 1,000,000 so'mlik xizmat uchun 400,000 so'm bersa, `Invoice.Status = PartiallyPaid`, `Patient.TotalDebt += 600,000` bo'ladi.
* **To'lov usullari:** Naqd, Uzcard/Humo, Click, Payme, Bank o'tkazmasi.

---

### 3.5. Nofunksional Talablar

* **O'zbekiston Telefon Formati:** Regex: `^\+998(9[012345789]|33|88|77|95)\d{7}$`. Noto'g'ri kiritilgan raqamlar `FluentValidation` darajasida rad etiladi.
* **Rate Limiting:** Public Booking endpointlari bitta IP dan 1 daqiqada maksimal 5 ta bron yaratish bilan cheklanadi (Brute force spamdan himoya).
* **RFC 7807 ProblemDetails Formati:** Barcha API xatolari standartlashtirilgan ko'rinishda qaytadi:
  ```json
  {
    "type": "https://api.dentacore.uz/errors/double-booking",
    "title": "Conflict Detected",
    "status": 409,
    "detail": "Shifokorning ushbu vaqt oralig'i (14:00 - 14:30) allaqachon band qilingan.",
    "instance": "/api/v1/public/booking"
  }
  ```
* **Audit Logging:** Har bir yozuvda `CreatedBy`, `CreatedAtUtc`, `LastModifiedBy`, `LastModifiedAtUtc` avtomatik yuritiladi.

---

## 4. MA'LUMOTLAR BAZASI ARXITEKTURASI (POSTGRESQL SCHEMA & ERD)

### 4.1. Entity Relationship Diagram (ERD)

```text
+-----------------------+           +-----------------------------+
|        Users          | 1       * |       DoctorSchedules       |
|-----------------------|-----------|-----------------------------|
| PK  Id                |           | PK  Id                      |
|     FullName          |           | FK  DoctorId                |
|     Email             |           |     DayOfWeek (0-6)         |
|     PasswordHash      |           |     StartTime (09:00)       |
|     Role (Enum)       |           |     EndTime (18:00)         |
|     Specialty         |           |     LunchStartTime (13:00)  |
|     ColorCode (HEX)   |           |     LunchEndTime (14:00)    |
+-----------+-----------+           +-----------------------------+
            | 1
            |
            | 1
            | *
+-----------v-----------+           +-----------------------------+
|     Appointments      | *       1 |          Patients           |
|-----------------------|-----------|-----------------------------|
| PK  Id                |           | PK  Id                      |
| FK  DoctorId          |           |     FullName                |
| FK  PatientId         |           |     PhoneNumber (+998...)   | UQ
| FK  ServiceId         |           |     BirthDate               |
|     StartTimeUtc      |           |     Gender                  |
|     EndTimeUtc        |           |     TotalDebt               |
|     Status (Enum)     |           |     Notes                   |
|     Source (Online/CRM|           +--------------+--------------+
|     Notes             |                          | 1
+-----------+-----------+                          |
            | 1                                    |
            | 1                                    | *
+-----------v-----------+           +--------------v--------------+
|   TreatmentRecords    |           |          Invoices           |
|-----------------------|           |-----------------------------|
| PK  Id                |           | PK  Id                      |
| FK  AppointmentId     |           | FK  PatientId               |
| FK  DoctorId          |           | FK  AppointmentId           |
|     Diagnosis         |           |     TotalAmount             |
|     OdontogramData(J) |           |     DiscountAmount          |
|     CreatedAtUtc      |           |     PaidAmount              |
+-----------------------+           |     Status (Unpaid, Paid...) |
                                    +--------------+--------------+
                                                   | 1
                                                   | *
                                    +--------------v--------------+
                                    |          Payments           |
                                    |-----------------------------|
                                    | PK  Id                      |
                                    | FK  InvoiceId               |
                                    |     Amount                  |
                                    |     Method (Cash, Card...)  |
                                    |     TransactionRef          |
                                    |     PaidAtUtc               |
                                    +-----------------------------+
```

---

### 4.2. To'liq PostgreSQL DDL Skripti

```sql
-- DentaCore PostgreSQL Production-Ready DDL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Users Table (Admin, Doctors, Receptionists)
CREATE TABLE "Users" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "FullName" VARCHAR(150) NOT NULL,
    "Email" VARCHAR(100) NOT NULL UNIQUE,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "Role" VARCHAR(30) NOT NULL, -- 'ClinicAdmin', 'Receptionist', 'Doctor'
    "Specialty" VARCHAR(100),    -- 'Ortodont', 'Implantolog', 'Terapevt'
    "ColorCode" VARCHAR(10) DEFAULT '#3B82F6', -- Kalendarda rangli ko'rsatish
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAtUtc" TIMESTAMPTZ
);

-- 2. Doctor Schedules Table
CREATE TABLE "DoctorSchedules" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "DayOfWeek" INT NOT NULL, -- 0 = Sunday, 1 = Monday ... 6 = Saturday
    "StartTime" TIME NOT NULL DEFAULT '09:00:00',
    "EndTime" TIME NOT NULL DEFAULT '18:00:00',
    "LunchStartTime" TIME NOT NULL DEFAULT '13:00:00',
    "LunchEndTime" TIME NOT NULL DEFAULT '14:00:00',
    "IsWorkingDay" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "uq_doctor_day" UNIQUE ("DoctorId", "DayOfWeek")
);

-- 3. Patients Table
CREATE TABLE "Patients" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "FullName" VARCHAR(150) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL UNIQUE,
    "BirthDate" DATE,
    "Gender" VARCHAR(10), -- 'Male', 'Female'
    "TotalDebt" NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    "Notes" TEXT,
    "CreatedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAtUtc" TIMESTAMPTZ
);
CREATE INDEX "idx_patients_phone" ON "Patients"("PhoneNumber");

-- 4. Services Table (Preyskurant)
CREATE TABLE "Services" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name" VARCHAR(150) NOT NULL,
    "Price" NUMERIC(14, 2) NOT NULL,
    "DurationMinutes" INT NOT NULL DEFAULT 30,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. Appointments Table (Double Booking Guard bilan)
CREATE TABLE "Appointments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "DoctorId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "ServiceId" UUID REFERENCES "Services"("Id") ON DELETE SET NULL,
    "StartTimeUtc" TIMESTAMPTZ NOT NULL,
    "EndTimeUtc" TIMESTAMPTZ NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled', 'NoShow'
    "Source" VARCHAR(20) NOT NULL DEFAULT 'Online', -- 'Online', 'CRM'
    "Notes" TEXT,
    "CreatedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAtUtc" TIMESTAMPTZ,
    CONSTRAINT "chk_appointment_time_valid" CHECK ("EndTimeUtc" > "StartTimeUtc"),
    CONSTRAINT "no_overlapping_appointments_for_doctor" 
        EXCLUDE USING gist (
            "DoctorId" WITH =,
            tsrange("StartTimeUtc", "EndTimeUtc", '[)') WITH &&
        ) WHERE ("Status" NOT IN ('Cancelled', 'NoShow'))
);
CREATE INDEX "idx_appointments_doctor_timerange" ON "Appointments"("DoctorId", "StartTimeUtc", "EndTimeUtc");
CREATE INDEX "idx_appointments_patient" ON "Appointments"("PatientId");

-- 6. Treatment Records & Odontogram (JSONB)
CREATE TABLE "TreatmentRecords" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "AppointmentId" UUID NOT NULL UNIQUE REFERENCES "Appointments"("Id") ON DELETE CASCADE,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE CASCADE,
    "DoctorId" UUID NOT NULL REFERENCES "Users"("Id"),
    "Diagnosis" TEXT NOT NULL,
    "Complaints" TEXT,
    "OdontogramData" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "CreatedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_treatment_odontogram_gin" ON "TreatmentRecords" USING gin ("OdontogramData");

-- 7. Invoices Table
CREATE TABLE "Invoices" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "AppointmentId" UUID REFERENCES "Appointments"("Id") ON DELETE SET NULL,
    "PatientId" UUID NOT NULL REFERENCES "Patients"("Id") ON DELETE RESTRICT,
    "TotalAmount" NUMERIC(14, 2) NOT NULL,
    "DiscountAmount" NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    "PaidAmount" NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'PartiallyPaid', 'Paid', 'Cancelled'
    "CreatedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Payments Table
CREATE TABLE "Payments" (
    "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "InvoiceId" UUID NOT NULL REFERENCES "Invoices"("Id") ON DELETE CASCADE,
    "Amount" NUMERIC(14, 2) NOT NULL,
    "Method" VARCHAR(30) NOT NULL, -- 'Cash', 'UzcardHumo', 'Click', 'Payme'
    "TransactionReference" VARCHAR(100),
    "PaidAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. RESTFUL API VA SIGNALR SPETSIFIKATSIYASI

### 5.1. Public Endpoints (Bemorlar uchun Ochiq Portal)

#### `GET /api/v1/public/doctors`
*Tavsif:* Onlayn qabulga yozilish mumkin bo'lgan faol shifokorlar va xizmatlar ro'yxatini olish.
*Response (200 OK):*
```json
[
  {
    "id": "7f8b0306-02e1-4560-bfa2-378b88d8b491",
    "fullName": "Dr. Jasur Aliyev",
    "specialty": "Bosh Stomatolog / Implantolog",
    "colorCode": "#0D9488",
    "rating": 4.9,
    "experienceYears": 12
  },
  {
    "id": "a1c238b1-36f9-4b6e-8e54-5867ffc8065b",
    "fullName": "Dr. Nilufar Karimova",
    "specialty": "Ortodont / Terapevt",
    "colorCode": "#8B5CF6",
    "rating": 4.8,
    "experienceYears": 8
  }
]
```

#### `GET /api/v1/public/slots?doctorId={guid}&date=2026-11-15`
*Tavsif:* Shifokorning tanlangan kundagi bo'sh 30-daqiqalik slotlarini hisoblab berish.
*Response (200 OK):*
```json
{
  "doctorId": "7f8b0306-02e1-4560-bfa2-378b88d8b491",
  "date": "2026-11-15",
  "totalAvailableSlots": 6,
  "slots": [
    { "startTime": "2026-11-15T09:00:00Z", "endTime": "2026-11-15T09:30:00Z", "displayTime": "09:00 - 09:30" },
    { "startTime": "2026-11-15T09:30:00Z", "endTime": "2026-11-15T10:00:00Z", "displayTime": "09:30 - 10:00" },
    { "startTime": "2026-11-15T11:00:00Z", "endTime": "2026-11-15T11:30:00Z", "displayTime": "11:00 - 11:30" },
    { "startTime": "2026-11-15T14:30:00Z", "endTime": "2026-11-15T15:00:00Z", "displayTime": "14:30 - 15:00" },
    { "startTime": "2026-11-15T15:00:00Z", "endTime": "2026-11-15T15:30:00Z", "displayTime": "15:00 - 15:30" },
    { "startTime": "2026-11-15T16:30:00Z", "endTime": "2026-11-15T17:00:00Z", "displayTime": "16:30 - 17:00" }
  ]
}
```

#### `POST /api/v1/public/book`
*Tavsif:* Bemor tomonidan onlayn navbat olish.
*Request Body:*
```json
{
  "doctorId": "7f8b0306-02e1-4560-bfa2-378b88d8b491",
  "serviceId": "55c4238e-049d-4e92-965a-8b1ec44d18fa",
  "startTimeUtc": "2026-11-15T14:30:00Z",
  "endTimeUtc": "2026-11-15T15:00:00Z",
  "patientFullName": "Otabek Salimov",
  "patientPhoneNumber": "+998901234567",
  "complaint": "Pastki o'ng tishimda kuchli og'riq bor"
}
```
*Response (201 Created):*
```json
{
  "appointmentId": "f9584b42-7a56-4c75-baea-df95d52e5058",
  "status": "Pending",
  "message": "Qabul muvaffaqiyatli band qilindi. Resepshn tez orada siz bilan bog'lanadi.",
  "bookingCode": "DC-7492"
}
```

---

### 5.2. Protected CRM Endpoints (Xodimlar uchun)

* `GET /api/v1/crm/appointments?date=2026-11-15&doctorId={id}` — Kunlik jadval
* `PATCH /api/v1/crm/appointments/{id}/status` — Status o'zgartirish (`Confirmed`, `InProgress`, `Completed`, `Cancelled`)
* `GET /api/v1/crm/patients/{id}/odontogram` — Bemorning to'liq 32 tish holatini olish
* `PUT /api/v1/crm/patients/{id}/odontogram` — Tish holatini yangilash (JSONB snapshot)
* `POST /api/v1/crm/billing/invoices` — Yangi hisob-faktura yaratish
* `POST /api/v1/crm/billing/invoices/{id}/payments` — To'lov qabul qilish (Avans yoki to'liq)
* `GET /api/v1/crm/analytics/summary` — Kunlik tushum, kutilayotgan qarzlar, qabullar soni

---

### 5.3. SignalR Real-Time Hub Spetsifikatsiyasi (`ClinicHub`)

* **Hub URL:** `/hubs/clinic`
* **Xavfsizlik:** JWT token query parametri yoki Bearer header orqali uzatiladi.

#### Serverdan Clientga yuboriladigan Real-Time Hodisalar (Events):

1. `AppointmentStatusChanged`
   ```json
   {
     "appointmentId": "f9584b42-7a56-4c75-baea-df95d52e5058",
     "newStatus": "InProgress",
     "updatedBy": "Dr. Jasur Aliyev",
     "timestamp": "2026-11-15T14:32:00Z"
   }
   ```
2. `NewOnlineBookingCreated`
   ```json
   {
     "appointmentId": "f9584b42-7a56-4c75-baea-df95d52e5058",
     "doctorName": "Dr. Jasur Aliyev",
     "patientName": "Otabek Salimov",
     "time": "14:30 - 15:00",
     "source": "Online"
   }
   ```
3. `SlotInvalidated`
   *Tavsif:* Kimdir vaqtni band qilgan zahoti, barcha ochiq turgan Public Booking oynalaridagi slot darhol xiralashadi va bloklanadi.

---

## 6. FRONTEND UI/UX VA SAHIFALAR OQIMI (USER FLOW)

### 6.1. Public Booking Wizard (Bemorlar uchun 3 qadam)
1. **1-qadam:** Shifokor va asosiy shikoyat turini tanlash (kartochkalar ko'rinishida, rasm, mutaxassislik va reyting).
2. **2-qadam:** Interaktiv kalendardan kun tanlash va mavjud 30-daqiqalik vaqt pufakchalarini (time chips) bosish.
3. **3-qadam:** Ism, sharif va O'zbekiston telefon raqamini kiritish (`+998 9_ ___ __ __` maskasi). "Qabulga yozilish" tugmasi bosilganda darhol animatsiya va buyurtma cheki (voucher) chiqadi.

### 6.2. Internal CRM Dashboard (Klinika Xodimlari uchun)
1. **Interactive Calendar Grid:**
   * Shifokorlar ustunlar bo'yicha (Multi-doctor column view).
   * Har bir kartochkada: Bemor ismi, xizmat nomi, status nishoni (Badge: Sariq = Kutmoqda, Moviy = Tasdiqlangan, Yashil = Qabulda, Kulrang = Yakunlangan).
   * 1-klik bilan statusni o'zgartirish ("Qabulga kirdi", "Chiqdi").
2. **Interactive Dental Odontogram (FDI 11–48):**
   * Yuqori va pastki jag' anatomik vektorli (SVG) ko'rinishi.
   * Har bir tish bosilganda 5 ta yuza ochiladi.
   * Rangli legendalar: Qizil = Karies, Moviy = Plomba, Sariq = Qoplama (Crown), Yashil = Implant, Qora chiziq = Olingan (Extracted).
   * Bir zumda umumiy davolash narxini hisoblaydi.
3. **Kassa va Moliyaviy Analitika:**
   * Kunlik kassa holati (Naqd tushum, Karta orqali, Click/Payme).
   * Qarzlar ro'yxati (Bemorlar bo'yicha filter).
   * 1-klik bilan chek chiqarish (Print receipt).

---

## 7. EDGE-CASES VA XAVFSIZLIK

1. **Simultaneous Double Booking (Poyga holati):**
   * Ikki foydalanuvchi bir vaqtda so'rov yuborsa, PostgreSQL Exclusion Constraint bittasini o'tkazib, ikkinchisiga `23P01` kodini beradi. Tizim ikkinchi so'rovga 409 Conflict qaytaradi va yangilangan bo'sh slotlar ro'yxatini taqdim etadi.
2. **Bemor Telefon Raqami Dublikatsiyasi (Idempotent Bemor):**
   * Bemor ikkinchi marta boshqa shifokorga yozilsa, yangi bemor ochilmaydi. Telefon raqami bo'yicha mavjud bemor profili aniqlanib, yangi qabul o'sha profilga bog'lanadi.
3. **Bekor Qilingan Slotni Jonlantirish:**
   * Shifokor yoki resepshn qabulni `Cancelled` qilganda, `Appointments` jadvalidagi exclusion constraint ushbu qatordan chetlatiladi va o'sha vaqt avtomatik ravishda onlayn portalda bo'sh slot sifatida paydo bo'ladi.
4. **Offline Rejim va SignalR Uzilishi:**
   * Agar internet uzilsa, frontendda "Ulanish tiklanmoqda..." banneri chiqadi va qayta ulanganda TanStack Query avtomatik `invalidateQueries` qilib eng so'nggi holatni tortib oladi.

---

## 8. 72 SOATLIK (3 KUNLIK) BAJARISH REJASI (SPRINT PLAN)

### 1-KUN (00:00 - 24:00): Core Backend, Database & Engine
* [x] **01-04 soat:** ASP.NET Core 8 Web API Clean Architecture strukturasini yaratish (`Domain`, `Application`, `Infrastructure`, `WebAPI`).
* [x] **05-08 soat:** PostgreSQL Docker konteyneri, EF Core Npgsql va `btree_gist` exclusion constraint migratsiyalarini yozish.
* [x] **09-14 soat:** Shifokorlar jadvali (`DoctorSchedule`) va 30 daqiqalik bo'sh slotlarni hisoblovchi `SlotCalculationEngine` algoritmini implementatsiya qilish.
* [x] **15-18 soat:** Telefon raqami (`+998`) idempotent bemor qidiruv servisi va JWT Auth tizimi.
* [x] **19-24 soat:** Public Booking API (`GET /doctors`, `GET /slots`, `POST /book`) va Postman / Swagger testlari.

### 2-KUN (24:00 - 48:00): CRM Logic, Real-Time & Odontogram API
* [x] **25-30 soat:** `AppointmentsController` CRUD va status o'zgartirish tranzaksiyalari.
* [x] **31-36 soat:** SignalR `ClinicHub` ni ulash: `AppointmentStatusChanged` va `NewOnlineBookingCreated` broadcastlari.
* [x] **37-42 soat:** FDI 11–48 Odontogram ma'lumotlar modeli va JSONB saqlovchi `TreatmentRecords` API lari.
* [x] **43-48 soat:** Kassa va Moliya moduli: `Invoices` va `Payments` hisob-kitob servisi, kunlik kassa xulosasi.

### 3-KUN (48:00 - 72:00): React Frontend, UI/UX, Odontogram & Docker
* [x] **49-56 soat:** Public Online Booking 3-qadamli Wizard sahifasi (mobil moslashuvchan, jonli slot tanlash).
* [x] **57-64 soat:** Internal CRM Dashboard: Interaktiv Kalendar Grid (shifokorlar ustunlari, status badge-lar), SignalR jonli qabul yangilanishi.
* [x] **65-68 soat:** Interaktiv FDI 11-48 Tish Formulasi (SVG tishlar, yuzalar, holat belgilash va avtomatik narx hisoblash).
* [x] **69-72 soat:** Kassa paneli, Dockerfile va `docker-compose.yml` ni yig'ish, production smoke testing.

---

## 9. DOCKER VA ISHGA TUSHIRISH (DEPLOYMENT SPECIFICATION)

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  dentacore-db:
    image: postgres:16-alpine
    container_name: dentacore_postgres
    restart: always
    environment:
      POSTGRES_DB: dentacore_db
      POSTGRES_USER: dentacore_user
      POSTGRES_PASSWORD: secure_dentacore_pass_2026
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dentacore_user -d dentacore_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  dentacore-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dentacore_backend
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=dentacore-db;Port=5432;Database=dentacore_db;Username=dentacore_user;Password=secure_dentacore_pass_2026
      - Jwt__Secret=SuperSecretKeyForDentaCoreProductionEnvironment2026HealthcareSystem!
    ports:
      - "5000:8080"
    depends_on:
      dentacore-db:
        condition: service_healthy

  dentacore-client:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: dentacore_frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - dentacore-api

volumes:
  pgdata:
```

---
*Ushbu hujjat AI dasturchilar (Cursor / Cline) uchun to'liq texnik manba hisoblanadi. Undagi arxitektura, SQL jadvallar va C# kodlar bevosita loyihaga nusxalab ishlatishga tayyor.*
