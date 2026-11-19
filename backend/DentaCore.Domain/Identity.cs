namespace DentaCore.Domain;

/// <summary>System roles. Stored as strings so JWT role claims stay human readable.</summary>
public static class RoleNames
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Doctor = "Doctor";
    public const string Receptionist = "Receptionist";
    public const string Patient = "Patient";

    public static readonly string[] All = { SuperAdmin, Doctor, Receptionist, Patient };
}

/// <summary>Modules protected by the RBAC matrix (columns of the permissions table).</summary>
public static class PermissionModules
{
    public const string Calendar = "Calendar";
    public const string Billing = "Billing";
    public const string PatientsDb = "PatientsDb";
    public const string PatientContact = "PatientContact";
    public const string Odontogram = "Odontogram";
    public const string Prescriptions = "Prescriptions";
    public const string Staff = "Staff";
    public const string Services = "Services";
    public const string Reports = "Reports";
    public const string Permissions = "Permissions";

    public static readonly string[] All =
    {
        Calendar, Billing, PatientsDb, PatientContact, Odontogram, Prescriptions, Staff, Services, Reports, Permissions
    };
}

/// <summary>Actions granted per module (the View / Edit / Delete checkboxes).</summary>
public static class PermissionActions
{
    public const string View = "View";
    public const string Edit = "Edit";
    public const string Delete = "Delete";

    public static readonly string[] All = { View, Edit, Delete };
}

/// <summary>Builds the canonical "Module.Action" permission code.</summary>
public static class PermissionCode
{
    public static string For(string module, string action) => $"{module}.{action}";
}

public static class SensitivePermissionCodes
{
    public const string CanViewPatientPhone = "SensitiveFields.CanViewPatientPhone";
    public const string CanViewTotalCashbox = "SensitiveFields.CanViewTotalCashbox";
    public const string CanViewOwnSalaryOnly = "SensitiveFields.CanViewOwnSalaryOnly";

    public static readonly string[] All =
    {
        CanViewPatientPhone,
        CanViewTotalCashbox,
        CanViewOwnSalaryOnly
    };
}

public class Role
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
}

public class Permission
{
    public int Id { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;

    /// <summary>"Module.Action" — used directly as the authorization policy name.</summary>
    public string Code { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}

public class RolePermission
{
    public int Id { get; set; }
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public int PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;

    /// <summary>SuperAdmin toggles this flag — the only place rights are granted or revoked.</summary>
    public bool IsGranted { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserPermission
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
    public bool IsGranted { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    /// <summary>Set for doctor accounts — links the login to its clinic profile.</summary>
    public Guid? DoctorId { get; set; }

    /// <summary>Set for patient accounts — links the login to its medical card.</summary>
    public Guid? PatientId { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
