using System.Reflection;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Polly.Extensions.Http;
using Schedules.Configuration;
using Schedules.Health;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;
using Schedules.Middleware;
using Schedules.Services;
using Schedules.Services.Interfaces;
using Schedules.Validators;
using Schedules.Workers;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var schedulesConnection = configuration.GetConnectionString("SchedulesDb");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xmlPath = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.Configure<FeatureFlagOptions>(configuration.GetSection(FeatureFlagOptions.SectionName));
builder.Services.Configure<GraphOptions>(configuration.GetSection(GraphOptions.SectionName));
builder.Services.Configure<JobOptions>(configuration.GetSection(JobOptions.SectionName));

builder.Services.AddDbContext<SchedulesDbContext>(opt =>
{
    opt.UseNpgsql(schedulesConnection);
});
builder.Services.AddDbContextFactory<SchedulesDbContext>(opt =>
{
    opt.UseNpgsql(schedulesConnection);
});

builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(schedulesConnection);
});

builder.Services.AddHangfireServer(options =>
{
    options.Queues = new[] { "default", "notifications", "imports" };
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = configuration["Authentication:Authority"];
        options.Audience = configuration["Authentication:Audience"];
        options.RequireHttpsMetadata = true;
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("ADMIN"));
    options.AddPolicy("TeamLead", policy => policy.RequireRole("ADMIN", "TL"));
    options.AddPolicy("Employee", policy => policy.RequireRole("ADMIN", "TL", "EMP"));
});

builder.Services.AddAutoMapper(Assembly.GetExecutingAssembly());
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreateScheduleRequestValidator>();
builder.Services.AddMemoryCache();

builder.Services.AddHttpClient("TeamsWebhook")
    .AddPolicyHandler(GetRetryPolicy());

builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IUserDirectory, DefaultUserDirectory>();
builder.Services.AddScoped<ScheduleImportWorker>();
builder.Services.AddScoped<TaskNotificationWorker>();
builder.Services.AddScoped<CalendarSyncWorker>();
builder.Services.AddScoped<DailyReminderWorker>();
builder.Services.AddSingleton<IMsGraphClient, MsGraphClient>();

builder.Services.AddOpenTelemetry()
    .WithTracing(tracer =>
    {
        tracer
            .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("Schedules.Api"))
            .AddAspNetCoreInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(configuration["Telemetry:OtlpEndpoint"]!);
            });
    });

builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database");

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
app.UseHangfireDashboard("/jobs", new DashboardOptions
{
    Authorization = []
});

var jobOptions = app.Services.GetRequiredService<IOptions<JobOptions>>().Value;
RecurringJob.AddOrUpdate<DailyReminderWorker>("daily-reminders", worker => worker.SendRemindersAsync(CancellationToken.None), jobOptions.ReminderSchedule);

app.Run();

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy() =>
    HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
