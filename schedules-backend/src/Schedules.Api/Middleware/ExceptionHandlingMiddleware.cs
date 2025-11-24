using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Schedules.Errors;

namespace Schedules.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            logger.LogWarning(ex, "Handled application exception {Code}", ex.Code);
            await WriteProblemAsync(context, ex.Code, ex.Message, HttpStatusCode.BadRequest);
        }
        catch (FluentValidation.ValidationException ex)
        {
            logger.LogWarning(ex, "Validation failure");
            await WriteProblemAsync(context, ErrorCodes.ValidationError, ex.Message, HttpStatusCode.BadRequest);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteProblemAsync(context, "INTERNAL_ERROR", "Unexpected error", HttpStatusCode.InternalServerError);
        }
    }

    private static async Task WriteProblemAsync(HttpContext context, string code, string message, HttpStatusCode statusCode)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        var payload = new
        {
            code,
            message,
            requestId = context.TraceIdentifier
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}

