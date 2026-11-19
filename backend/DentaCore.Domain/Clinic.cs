namespace DentaCore.Domain;

public class Doctor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string ColorCode { get; set; } = "#0D9488";
    public int ExperienceYears { get; set; }
    public decimal Rating { get; set; }

    /// <summary>Shift boundaries used by the slot engine.</summary>
    public TimeOnly StartHour { get; set; }
    public TimeOnly EndHour { get; set; }
    public TimeOnly LunchStart { get; set; }
    public TimeOnly LunchEnd { get; set; }

    /// <summary>ISO day numbers, comma separated: "1,2,3,4,5,6".</summary>
    public string WorkingDays { get; set; } = "1,2,3,4,5,6";

    /// <summary>Profit share of the services this doctor performed, in percent.</summary>
    public decimal ProfitSharePercent { get; set; } = 30m;

    /// <summary>Fixed monthly salary paid on top of the profit share.</summary>
    public decimal BaseSalary { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<DoctorSchedule> Schedules { get; set; } = new List<DoctorSchedule>();

    public bool WorksOn(DayOfWeek day)
    {
        var isoDay = day == DayOfWeek.Sunday ? 7 : (int)day;

        return WorkingDays
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(part => int.TryParse(part, out var value) && value == isoDay);
    }
}

public class DoctorSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public TimeOnly? BreakStart { get; set; }
    public TimeOnly? BreakEnd { get; set; }
    public int SlotDurationMinutes { get; set; } = 30;
    public bool IsActive { get; set; } = true;
}

public class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public string Gender { get; set; } = "Erkak";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateOnly? LastVisit { get; set; }

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<ToothRecord> Teeth { get; set; } = new List<ToothRecord>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

public class ServiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Terapiya";
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
