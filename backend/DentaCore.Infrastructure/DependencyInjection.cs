using DentaCore.Infrastructure.Persistence;
using DentaCore.Application.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DentaCore.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? "Data Source=dentacore.db";
        var databaseProvider = configuration["Database:Provider"];

        services.AddDbContext<AppDbContext>(options =>
        {
            if (string.Equals(databaseProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase) ||
                connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
                connectionString.Contains("Username=", StringComparison.OrdinalIgnoreCase))
                options.UseNpgsql(connectionString);
            else
                options.UseSqlite(connectionString);
        });
        services.AddScoped<IAppointmentStatusRepository, AppointmentStatusRepository>();

        return services;
    }
}
