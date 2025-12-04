using System.Reflection;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Performance.Configuration;
using Performance.Health;
using Performance.Infrastructure.Data;
using Performance.Integrations;
using Performance.Middleware;
using Performance.Services;
using Performance.Services.Interfaces;
using Performance.Workers;
using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var performanceConnection = configuration.GetConnectionString("PerformanceDb") 
    ?? configuration.GetConnectionString("SchedulesDb"); // Fallback to shared DB connection

// Add CORS support
builder.Services.AddCors(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins(
                    "http://localhost:5173",
                    "https://localhost:5173",
                    "http://localhost:3000",
                    "http://localhost:56956",
                    "http://localhost:8080")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    }
    else
    {
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
        options.JsonSerializerOptions.Converters.Add(new Performance.Infrastructure.JsonConverters.DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new Performance.Infrastructure.JsonConverters.NullableDateOnlyJsonConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
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

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your Cognito JWT token below.",
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

builder.Services.Configure<GraphOptions>(configuration.GetSection(GraphOptions.SectionName));
builder.Services.Configure<PersistenceOptions>(configuration.GetSection(PersistenceOptions.SectionName));

var graphOptionsSnapshot = new GraphOptions();
configuration.GetSection(GraphOptions.SectionName).Bind(graphOptionsSnapshot);
var graphConfigured = !string.IsNullOrWhiteSpace(graphOptionsSnapshot.TenantId)
                      && !string.IsNullOrWhiteSpace(graphOptionsSnapshot.ClientId)
                      && !string.IsNullOrWhiteSpace(graphOptionsSnapshot.ClientSecret);

var useInMemoryDatabase = configuration.GetValue<bool?>($"{PersistenceOptions.SectionName}:UseInMemory") ?? false;

if (useInMemoryDatabase)
{
    builder.Services.AddDbContext<PerformanceDbContext>(opt => opt.UseInMemoryDatabase("PerformanceDb"));
    builder.Services.AddHangfire(config => config.UseMemoryStorage());
}
else
{
    builder.Services.AddDbContext<PerformanceDbContext>(opt =>
    {
        opt.UseNpgsql(performanceConnection);
    });
    builder.Services.AddHangfire(config =>
    {
        config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(performanceConnection);
    });
}

builder.Services.AddDbContextFactory<PerformanceDbContext>((_, options) =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase("PerformanceDb");
    }
    else
    {
        options.UseNpgsql(performanceConnection);
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
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = configuration["Authentication:Authority"],
            ValidateLifetime = true,
            ValidateAudience = !builder.Environment.IsDevelopment(),
            ValidAudience = configuration["Authentication:Audience"],
            ValidAudiences = builder.Environment.IsDevelopment()
                ? null
                : new[]
                {
                    configuration["Authentication:Audience"],
                    "3rdnl5ind8guti89jrbob85r4i" // Cognito Client ID
                },
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = "cognito:username"
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("ADMIN"));
    options.AddPolicy("Employee", policy => policy.RequireRole("ADMIN", "EMP"));
});

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient("TeamsWebhook")
    .AddPolicyHandler(GetRetryPolicy());

// Register services
builder.Services.AddScoped<IMetricsService, MetricsService>();
builder.Services.AddScoped<IKpiService, KpiService>();
builder.Services.AddScoped<IKpiTargetService, KpiTargetService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<ITrainingCourseService, TrainingCourseService>();
builder.Services.AddScoped<ITrainingAssignmentService, TrainingAssignmentService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<KpiImportWorker>();
builder.Services.AddScoped<TrainingNotificationWorker>();

// Register integrations
if (graphConfigured)
{
    builder.Services.AddSingleton<IMsGraphClient, MsGraphClient>();
}
else
{
    Console.WriteLine("Graph credentials not configured. Falling back to NoopMsGraphClient.");
    builder.Services.AddSingleton<IMsGraphClient, NoopMsGraphClient>();
}

// Register SES email service (configure AWS credentials via environment variables or IAM role)
var awsRegion = configuration["AWS:Region"] ?? "ap-southeast-2";
var emailConfigured = !string.IsNullOrWhiteSpace(awsRegion);
if (emailConfigured)
{
    builder.Services.AddAWSService<IAmazonSimpleEmailService>();
    builder.Services.AddScoped<IEmailService, SesEmailService>();
}
else
{
    Console.WriteLine("Email service not configured. Falling back to NoopEmailService.");
    builder.Services.AddScoped<IEmailService, NoopEmailService>();
}

builder.Services.AddOpenTelemetry()
    .WithTracing(tracer =>
    {
        tracer
            .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("Performance.Api"))
            .AddAspNetCoreInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(configuration["Telemetry:OtlpEndpoint"] ?? "http://localhost:4318");
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

// Database migrations are handled via raw SQL files (migrations/20251203_phase6_performance_training.sql)
// Run the SQL migration directly on RDS using pgAdmin or AWS Query Editor before deploying.

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

app.Run();

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy() =>
    HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
