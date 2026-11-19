using DentaCore.Domain;
using Microsoft.EntityFrameworkCore;

namespace DentaCore.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<ServiceItem> Services => Set<ServiceItem>();

    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<BookedSlot> BookedSlots => Set<BookedSlot>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<ToothRecord> ToothRecords => Set<ToothRecord>();
    public DbSet<ToothRecordHistory> ToothRecordHistory => Set<ToothRecordHistory>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(r => r.Name).IsUnique();
            entity.Property(r => r.Name).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasIndex(p => p.Code).IsUnique();
            entity.Property(p => p.Code).HasMaxLength(96).IsRequired();
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasIndex(rp => new { rp.RoleId, rp.PermissionId }).IsUnique();

            entity.HasOne(rp => rp.Role)
                .WithMany(r => r.Permissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Permission)
                .WithMany()
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPermission>(entity =>
        {
            entity.HasIndex(p => new { p.UserId, p.PermissionId }).IsUnique();
            entity.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.Permission).WithMany().HasForeignKey(p => p.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(160).IsRequired();
            entity.Property(u => u.FullName).HasMaxLength(160).IsRequired();

            entity.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(t => t.Token).IsUnique();

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.HasIndex(d => d.Email).IsUnique();
            entity.Property(d => d.FullName).HasMaxLength(160).IsRequired();
            entity.Property(d => d.ProfitSharePercent).HasPrecision(5, 2);
            entity.Property(d => d.BaseSalary).HasPrecision(14, 2);
            entity.Property(d => d.Rating).HasPrecision(3, 2);
        });

        modelBuilder.Entity<DoctorSchedule>(entity =>
        {
            entity.HasIndex(schedule => new { schedule.DoctorId, schedule.DayOfWeek }).IsUnique();
            entity.Property(schedule => schedule.SlotDurationMinutes).IsRequired();
            entity.HasOne(schedule => schedule.Doctor)
                .WithMany(doctor => doctor.Schedules)
                .HasForeignKey(schedule => schedule.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasIndex(p => p.PhoneNumber).IsUnique();
            entity.Property(p => p.FullName).HasMaxLength(160).IsRequired();
        });

        modelBuilder.Entity<ServiceItem>(entity =>
        {
            entity.Property(s => s.Price).HasPrecision(14, 2);
            entity.Property(s => s.Name).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasIndex(a => new { a.DoctorId, a.Date, a.StartTime });
            entity.Property(a => a.Status).HasMaxLength(32).IsRequired();
            entity.Property(a => a.Source).HasMaxLength(16).IsRequired();
            entity.Property(a => a.BookingCode).HasMaxLength(16);

            // Optimistic concurrency: a stale write fails instead of overwriting.
            entity.Property(a => a.Version).IsConcurrencyToken();

            entity.HasOne(a => a.Doctor)
                .WithMany(d => d.Appointments)
                .HasForeignKey(a => a.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Patient)
                .WithMany(p => p.Appointments)
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Service)
                .WithMany()
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BookedSlot>(entity =>
        {
            // The double-booking guard: two identical reservations cannot exist in the database.
            entity.HasIndex(s => new { s.DoctorId, s.Date, s.StartTime }).IsUnique();
        });

        modelBuilder.Entity<IdempotencyRecord>(entity =>
        {
            entity.HasIndex(r => new { r.Operation, r.Key }).IsUnique();
            entity.Property(r => r.Operation).HasMaxLength(64).IsRequired();
            entity.Property(r => r.Key).HasMaxLength(128).IsRequired();
            entity.Property(r => r.PayloadHash).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<ToothRecord>(entity =>
        {
            entity.HasIndex(t => new { t.PatientId, t.ToothNumber }).IsUnique();
            entity.Property(t => t.Condition).HasMaxLength(32).IsRequired();
            entity.Property(t => t.Cost).HasPrecision(14, 2);

            entity.HasOne(t => t.Patient)
                .WithMany(p => p.Teeth)
                .HasForeignKey(t => t.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ToothRecordHistory>(entity =>
        {
            entity.HasIndex(h => new { h.PatientId, h.ToothNumber, h.ChangedAt });

            entity.HasOne(h => h.ToothRecord)
                .WithMany(t => t.History)
                .HasForeignKey(h => h.ToothRecordId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasOne(p => p.Patient)
                .WithMany()
                .HasForeignKey(p => p.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Doctor)
                .WithMany()
                .HasForeignKey(p => p.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Appointment)
                .WithMany()
                .HasForeignKey(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasOne(i => i.Prescription)
                .WithMany(p => p.Items)
                .HasForeignKey(i => i.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(i => i.ReceiptNumber);
            entity.Property(i => i.TotalAmount).HasPrecision(14, 2);
            entity.Property(i => i.DiscountAmount).HasPrecision(14, 2);
            entity.Property(i => i.PaidAmount).HasPrecision(14, 2);
            entity.Property(i => i.DebtAmount).HasPrecision(14, 2);
            entity.Property(i => i.Status).HasMaxLength(24).IsRequired();

            entity.HasOne(i => i.Patient)
                .WithMany(p => p.Invoices)
                .HasForeignKey(i => i.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Appointment)
                .WithMany()
                .HasForeignKey(i => i.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(i => i.Doctor)
                .WithMany()
                .HasForeignKey(i => i.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.Property(i => i.UnitPrice).HasPrecision(14, 2);

            entity.HasOne(i => i.Invoice)
                .WithMany(inv => inv.Items)
                .HasForeignKey(i => i.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Amount).HasPrecision(14, 2);
            entity.Property(p => p.Method).HasMaxLength(24).IsRequired();

            entity.HasOne(p => p.Invoice)
                .WithMany(i => i.Payments)
                .HasForeignKey(p => p.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(l => l.Timestamp);
            entity.Property(l => l.Action).HasMaxLength(96);
        });

        ApplyJsonColumns(modelBuilder);
    }

    /// <summary>JSONB on PostgreSQL, TEXT on SQLite — same EF model, different storage.</summary>
    private void ApplyJsonColumns(ModelBuilder modelBuilder)
    {
        var isPostgres = Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;
        var jsonType = isPostgres ? "jsonb" : "TEXT";

        modelBuilder.Entity<ToothRecord>()
            .Property(t => t.SurfacesJson)
            .HasColumnType(jsonType);

        modelBuilder.Entity<ToothRecordHistory>()
            .Property(h => h.SnapshotJson)
            .HasColumnType(jsonType);
    }
}
