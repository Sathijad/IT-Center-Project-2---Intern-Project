using System.Text.Json;
using Schedules.Api.Infrastructure.Exceptions;

namespace Schedules.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            logger.LogWarning(ex, "Handled API exception {Code}", ex.ErrorCode);
            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                code = ex.ErrorCode,
                message = ex.Message,
                requestId = context.TraceIdentifier
            }));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                code = "INTERNAL_ERROR",
                message = "Unexpected error occurred",
                requestId = context.TraceIdentifier
            }));
        }
    }
}

