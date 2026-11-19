namespace DentaCore.Domain;

public static class AppointmentStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string NoShow = "NoShow";

    public static readonly string[] All =
    {
        Pending, Confirmed, InProgress, Completed, Cancelled, NoShow
    };

    /// <summary>Statuses that keep the slot occupied.</summary>
    public static bool OccupiesSlot(string status) =>
        status is Pending or Confirmed or InProgress or Completed;
}

public static class AppointmentSource
{
    public const string Online = "Online";
    public const string Crm = "CRM";
}

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid? ServiceId { get; set; }
    public ServiceItem? Service { get; set; }

    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public string Status { get; set; } = AppointmentStatus.Pending;
    public string Source { get; set; } = AppointmentSource.Crm;
    public string? Notes { get; set; }
    public string BookingCode { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Optimistic concurrency token. Incremented on every write, so a stale UPDATE throws
    /// DbUpdateConcurrencyException instead of silently overwriting a colleague's booking.
    /// </summary>
    public int Version { get; set; } = 1;
}

/// <summary>
/// Exclusive slot reservation. Enforces "double booking" protection at the database level:
/// a unique index on (DoctorId, Date, StartTime) makes the second concurrent insert fail,
/// and the row is removed when the appointment is cancelled or marked as a no-show.
/// </summary>
public class BookedSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DoctorId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public Guid AppointmentId { get; set; }
    public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
}

public class IdempotencyRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Operation { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string PayloadHash { get; set; } = string.Empty;
    public Guid ResponseId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class ToothCondition
{
    public const string Healthy = "Healthy";
    public const string Caries = "Caries";
    public const string Filling = "Filling";
    public const string Crown = "Crown";
    public const string Endodontic = "Endodontic";
    public const string Implant = "Implant";
    public const string Extracted = "Extracted";

    public static readonly string[] All =
    {
        Healthy, Caries, Filling, Crown, Endodontic, Implant, Extracted
    };
}

/// <summary>Current state of one FDI tooth (11–48) belonging to a patient.</summary>
public class ToothRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    /// <summary>FDI number: quadrants 1–4, teeth 1–8 (e.g. 16, 24, 46).</summary>
    public int ToothNumber { get; set; }

    public string Condition { get; set; } = ToothCondition.Healthy;

    /// <summary>MODBL surfaces serialised as a JSON array — a jsonb column on PostgreSQL.</summary>
    public string SurfacesJson { get; set; } = "[]";

    public string? Diagnosis { get; set; }
    public string? TreatmentPlan { get; set; }
    public decimal Cost { get; set; }

    public Guid? UpdatedByUserId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ToothRecordHistory> History { get; set; } = new List<ToothRecordHistory>();
}

/// <summary>Append-only audit trail of odontogram changes (one row per tooth mutation).</summary>
public class ToothRecordHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ToothRecordId { get; set; }
    public ToothRecord ToothRecord { get; set; } = null!;

    public Guid PatientId { get; set; }
    public int ToothNumber { get; set; }

    /// <summary>Full JSON snapshot of the tooth after the change.</summary>
    public string SnapshotJson { get; set; } = "{}";

    public Guid? ChangedByUserId { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

public class Prescription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public Guid? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public string? Notes { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
}

public class PrescriptionItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;

    public string MedicineName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
}
