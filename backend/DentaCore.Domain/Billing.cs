namespace DentaCore.Domain;

public static class InvoiceStatus
{
    public const string Unpaid = "Unpaid";
    public const string PartiallyPaid = "PartiallyPaid";
    public const string Paid = "Paid";
    public const string Cancelled = "Cancelled";
}

public static class PaymentMethods
{
    public const string Cash = "Cash";
    public const string UzcardHumo = "UzcardHumo";
    public const string Click = "Click";
    public const string Payme = "Payme";

    public static readonly string[] All = { Cash, UzcardHumo, Click, Payme };
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public Guid? DoctorId { get; set; }
    public Doctor? Doctor { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal PaidAmount { get; set; }

    /// <summary>Outstanding balance: Total - Discount - Paid. Always recalculated by the service.</summary>
    public decimal DebtAmount { get; set; }

    public string Status { get; set; } = InvoiceStatus.Unpaid;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class InvoiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public Guid? ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }

    public decimal LineTotal => Quantity * UnitPrice;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public Guid PatientId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = PaymentMethods.Cash;
    public string ReferenceCode { get; set; } = string.Empty;

    public Guid? ReceivedByUserId { get; set; }
    public string ReceivedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class AuditStatus
{
    public const string Success = "Success";
    public const string Warning = "Warning";
    public const string Blocked = "Blocked";
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Guid? ActorUserId { get; set; }
    public string Actor { get; set; } = "Anonymous";
    public string ActorRole { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Status { get; set; } = AuditStatus.Success;
}

/// <summary>Refresh tokens are rotated on every use and revoked on logout.</summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
}
