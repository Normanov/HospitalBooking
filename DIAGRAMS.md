# DentaCore — Architecture Diagrams

All visual architecture, workflow, and entity relationship representations are kept in this file. Diagrams describe the target MVP; the current repository is a frontend-only prototype and does not yet implement the API/database shown below.

## 1. Target system context

```mermaid
flowchart LR
  Portal["Public and Patient Portal<br/>React + TypeScript"]
  CRM["Staff CRM<br/>React + TypeScript"]
  API["ASP.NET Core 8 API<br/>Authentication, authorization, validation"]
  App["Application and Domain<br/>Booking, clinical, billing use cases"]
  DB[("PostgreSQL<br/>EF Core / Npgsql")]
  Notify["SignalR Hub<br/>Authorized status events"]
  Portal -->|"HTTPS"| API
  CRM -->|"HTTPS + access token"| API
  API --> App
  App -->|"EF Core LINQ / transaction"| DB
  API -->|"Authorized groups only"| Notify
  Notify --> CRM
  Notify --> Portal
```

## 2. Booking reservation flow

```mermaid
sequenceDiagram
  autonumber
  actor Patient as Portal user
  actor Reception as Receptionist
  participant API as Booking API
  participant DB as PostgreSQL
  par Patient booking request
    Patient->>API: POST booking + idempotency key
  and Reception desk booking request
    Reception->>API: POST booking + authenticated identity
  end
  API->>API: Validate identity/input, clinic, schedule, service and slot grid
  API->>DB: Begin transaction
  API->>DB: EF insert appointment and one reservation per occupied slot
  Note over DB: Unique (ClinicId, DoctorId, SlotStartUtc) index serializes conflicts
  alt Reservation transaction wins
    DB-->>API: Commit
    API-->>Patient: 201 Created / booking reference
    API-->>Reception: 201 Created / booking reference
  else Slot already reserved
    DB-->>API: Unique reservation conflict; rollback
    API-->>Patient: 409 Problem Details
    API-->>Reception: 409 Problem Details
  end
```

## 3. Authorization and data-scope flow

```mermaid
flowchart TD
  Request["HTTP request"]
  Public{"Public endpoint?"}
  JWT["Validate JWT, expiry, issuer and audience"]
  Role{"Role baseline allowed?"}
  Grant{"Current module/action grant?"}
  Scope{"Clinic and record ownership/assignment valid?"}
  Handler["Execute use case with scoped EF Core query"]
  Allow["Return permitted DTO"]
  NoAuth["401 Unauthorized"]
  Deny["403 Forbidden or scoped 404"]

  Request --> Public
  Public -->|Yes| Handler
  Public -->|No| JWT
  JWT -->|Invalid/missing| NoAuth
  JWT -->|Valid| Role
  Role -->|No| Deny
  Role -->|Yes| Grant
  Grant -->|No| Deny
  Grant -->|Yes| Scope
  Scope -->|No| Deny
  Scope -->|Yes| Handler
  Handler --> Allow
```

## 4. Core entities and relationships

```mermaid
erDiagram
  CLINIC ||--o{ USER : contains
  CLINIC ||--o{ PATIENT : owns
  CLINIC ||--o{ DOCTOR_SCHEDULE : configures
  CLINIC ||--o{ APPOINTMENT : scopes
  CLINIC ||--o{ STAFF_PERMISSION : scopes
  CLINIC ||--o{ AUDIT_EVENT : records
  USER ||--o| PATIENT : "may map to"
  USER ||--o{ DOCTOR_SCHEDULE : works
  USER ||--o{ APPOINTMENT : "assigned doctor"
  PATIENT ||--o{ APPOINTMENT : books
  APPOINTMENT ||--|{ APPOINTMENT_SLOT_RESERVATION : reserves
  PATIENT ||--o{ CLINICAL_RECORD : has
  APPOINTMENT ||--o{ CLINICAL_RECORD : encounter
  USER ||--o{ CLINICAL_RECORD : authors
  PATIENT ||--o{ INVOICE : billed
  APPOINTMENT ||--o{ INVOICE : produces
  INVOICE ||--o{ INVOICE_LINE : includes
  INVOICE ||--o{ PAYMENT : receives
  USER ||--o{ PAYMENT : records
  USER ||--o{ STAFF_PERMISSION : receives
  USER ||--o{ AUDIT_EVENT : acts

  CLINIC {
    uuid Id PK
    string Name
    string TimeZone
  }
  USER {
    uuid Id PK
    uuid ClinicId FK
    string Role
    string IdentitySubject
    bool IsActive
  }
  PATIENT {
    uuid Id PK
    uuid ClinicId FK
    uuid UserId FK
    string FullName
    string PhoneNumber
  }
  DOCTOR_SCHEDULE {
    uuid Id PK
    uuid ClinicId FK
    uuid DoctorId FK
    int DayOfWeek
    time StartLocal
    time EndLocal
  }
  APPOINTMENT {
    uuid Id PK
    uuid ClinicId FK
    uuid DoctorId FK
    uuid PatientId FK
    datetime StartUtc
    datetime EndUtc
    string Status
  }
  APPOINTMENT_SLOT_RESERVATION {
    uuid Id PK
    uuid ClinicId FK
    uuid DoctorId FK
    uuid AppointmentId FK
    datetime SlotStartUtc UK
  }
  CLINICAL_RECORD {
    uuid Id PK
    uuid ClinicId FK
    uuid PatientId FK
    uuid AppointmentId FK
    uuid AuthorId FK
    jsonb Odontogram
    datetime RecordedAtUtc
  }
  INVOICE {
    uuid Id PK
    uuid ClinicId FK
    uuid PatientId FK
    uuid AppointmentId FK
    decimal TotalAmount
    string Currency
  }
  INVOICE_LINE {
    uuid Id PK
    uuid InvoiceId FK
    string ServiceNameSnapshot
    decimal UnitPrice
    int Quantity
  }
  PAYMENT {
    uuid Id PK
    uuid ClinicId FK
    uuid InvoiceId FK
    uuid RecordedBy FK
    decimal Amount
    string Method
    datetime CreatedAtUtc
  }
  STAFF_PERMISSION {
    uuid Id PK
    uuid ClinicId FK
    uuid StaffUserId FK
    string PermissionKey
    bool IsEnabled
  }
  AUDIT_EVENT {
    uuid Id PK
    uuid ClinicId FK
    uuid ActorId FK
    string Action
    string ResourceType
    uuid ResourceId
    datetime CreatedAtUtc
  }
```

The `APPOINTMENT_SLOT_RESERVATION` unique index must cover `(ClinicId, DoctorId, SlotStartUtc)`. The JSON odontogram shape needs a versioned schema and revision history; do not treat JSON storage as a substitute for authorization or audit.

## 5. MVP deployment boundary

```mermaid
flowchart TB
  Internet["Browser"]
  Edge["TLS reverse proxy<br/>trusted forwarding headers"]
  Web["React static application"]
  Api["ASP.NET Core API"]
  Db["PostgreSQL<br/>least-privilege app role + RLS"]
  Secrets["Secret manager"]
  Logs["PHI-safe logs + audit store"]
  Internet --> Edge
  Edge --> Web
  Edge --> Api
  Api --> Db
  Api --> Secrets
  Api --> Logs
```

Never expose PostgreSQL directly to browsers. The reverse proxy is the only trusted source for forwarded client IP and TLS termination metadata.
