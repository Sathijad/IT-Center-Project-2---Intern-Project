using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using OpenTelemetry.Instrumentation.Runtime;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Schedules.Api.Data;
using Schedules.Api.Integrations;
using Schedules.Api.Middleware;
using Schedules.Api.Options;
using Schedules.Api.Security;
using Schedules.Api.Services;
using Schedules.Api.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<FeatureFlagOptions>(builder.Configuration.GetSection("FeatureFlags"));
builder.Services.Configure<MsGraphOptions>(builder.Configuration.GetSection("MsGraph"));
builder.Services.Configure<TeamsOptions>(builder.Configuration.GetSection("Teams"));

builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddFluentValidationAutoValidation()
    .AddValidatorsFromAssemblyContaining<Program>();

var connectionString = builder.Configuration.GetConnectionString("MainDatabase")
    ?? throw new InvalidOperationException("Connection string 'MainDatabase' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString);

builder.Services.AddHangfire(config =>
{
    config.UseSimpleAssemblyNameTypeSerializer()
          .UseRecommendedSerializerSettings()
          .UsePostgreSqlStorage(options =>
          {
              options.UseNpgsqlConnection(connectionString);
          });
});
builder.Services.AddHangfireServer();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.Audience = builder.Configuration["Jwt:Audience"];
        options.RequireHttpsMetadata = true;
    });

builder.Services.AddAuthorization();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("Schedules.Api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IFeatureFlagService, FeatureFlagService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<CsvImportWorker>();
builder.Services.AddScoped<CalendarSyncWorker>();
builder.Services.AddScoped<ReminderWorker>();

builder.Services.AddHttpClient<IMsGraphClient, MsGraphClient>();
builder.Services.AddHttpClient<ITeamsNotifier, TeamsNotifier>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHangfireDashboard("/hangfire");

using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<CalendarSyncWorker>("calendar-sync", job => job.SyncUpcomingSchedulesAsync(CancellationToken.None), Cron.Hourly);
    recurringJobs.AddOrUpdate<ReminderWorker>("task-reminders", job => job.SendDueTaskRemindersAsync(CancellationToken.None), Cron.Daily);
}

app.Run();
