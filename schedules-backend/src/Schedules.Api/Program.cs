using System.Reflection;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
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
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var schedulesConnection = configuration.GetConnectionString("SchedulesDb");

// Add CORS support
builder.Services.AddCors(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        // In development, allow localhost origins
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins("http://localhost:5173", "https://localhost:5173", "http://localhost:3000")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    }
    else
    {
        // In production, specify exact origins
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? new[] { "https://your-production-domain.com" };
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    }
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Use camelCase for JSON serialization
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Allow case-insensitive query parameter binding
        options.SuppressModelStateInvalidFilter = false;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xmlPath = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
    
    // Add JWT Bearer authentication to Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your Cognito JWT token below.\n\nExample: Bearer eyJraWQiOiJ...",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<FeatureFlagOptions>(configuration.GetSection(FeatureFlagOptions.SectionName));
builder.Services.Configure<GraphOptions>(configuration.GetSection(GraphOptions.SectionName));
builder.Services.Configure<JobOptions>(configuration.GetSection(JobOptions.SectionName));
builder.Services.Configure<PersistenceOptions>(configuration.GetSection(PersistenceOptions.SectionName));

var graphOptionsSnapshot = new GraphOptions();
configuration.GetSection(GraphOptions.SectionName).Bind(graphOptionsSnapshot);
var graphConfigured = !string.IsNullOrWhiteSpace(graphOptionsSnapshot.TenantId)
                      && !string.IsNullOrWhiteSpace(graphOptionsSnapshot.ClientId)
                      && !string.IsNullOrWhiteSpace(graphOptionsSnapshot.ClientSecret);

var useInMemoryDatabase = configuration.GetValue<bool?>($"{PersistenceOptions.SectionName}:UseInMemory") ?? false;

if (useInMemoryDatabase)
{
    builder.Services.AddDbContext<SchedulesDbContext>(opt => opt.UseInMemoryDatabase("SchedulesDb"));
    builder.Services.AddHangfire(config => config.UseMemoryStorage());
}
else
{
    builder.Services.AddDbContext<SchedulesDbContext>(opt =>
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
}

builder.Services.AddDbContextFactory<SchedulesDbContext>((_, options) =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase("SchedulesDb");
    }
    else
    {
        options.UseNpgsql(schedulesConnection);
    }
}, ServiceLifetime.Scoped);

builder.Services.AddHangfireServer(options =>
{
    options.Queues = new[] { "default", "notifications", "imports" };
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = configuration["Authentication:Authority"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        
        // IMPORTANT: Map inbound claims to preserve original JWT claim names
        // This ensures 'sub' claim is available as 'sub', not mapped to a different type
        options.MapInboundClaims = false;
        
        // Configure token validation parameters
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = configuration["Authentication:Authority"],
            ValidateLifetime = true,
            // For development: disable audience validation (Cognito access tokens may not have 'aud' claim)
            // For production: enable and set proper audience
            ValidateAudience = !builder.Environment.IsDevelopment(),
            ValidAudience = configuration["Authentication:Audience"],
            // Also accept Cognito Client ID as valid audience if provided
            ValidAudiences = builder.Environment.IsDevelopment() 
                ? null 
                : new[]
                {
                    configuration["Authentication:Audience"],
                    "3rdnl5ind8guti89jrbob85r4i" // Cognito Client ID
                },
            // Map Cognito groups to ASP.NET Core role claims
            RoleClaimType = "cognito:groups",
            NameClaimType = "cognito:username"
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("ADMIN"));
    // Removed TeamLead policy - only ADMIN and EMPLOYEE roles exist
    options.AddPolicy("Employee", policy => policy.RequireRole("ADMIN", "EMP"));
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

if (graphConfigured)
{
    builder.Services.AddSingleton<IMsGraphClient, MsGraphClient>();
}
else
{
    Console.WriteLine("Graph credentials not configured. Falling back to NoopMsGraphClient.");
    builder.Services.AddSingleton<IMsGraphClient, NoopMsGraphClient>();
}

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

var healthChecks = builder.Services.AddHealthChecks();
if (useInMemoryDatabase)
{
    healthChecks.AddCheck("in_memory_database", () => HealthCheckResult.Healthy("In-memory database in use"));
}
else
{
    healthChecks.AddCheck<DatabaseHealthCheck>("database");
}

var app = builder.Build();

// Database migrations are handled via raw SQL files (migrations/20251125_phase4_schedules.sql)
// Run the SQL migration directly on RDS using pgAdmin or AWS Query Editor before deploying.
// This follows the same pattern as Phase 2 (Leave/Attendance) and Phase 3 (Booking).
// Do NOT use EF Core migrations (dotnet ef database update) for production/RDS.

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("AllowFrontend");
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
