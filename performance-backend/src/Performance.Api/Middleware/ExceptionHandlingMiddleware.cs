using System.Net;
using System.Text.Json;
using Performance.Errors;

namespace Performance.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = exception switch
        {
            NotFoundException => HttpStatusCode.NotFound,
            ConflictException => HttpStatusCode.Conflict,
            ValidationException => HttpStatusCode.BadRequest,
            _ => HttpStatusCode.InternalServerError
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Include inner exception details for database errors
        var errorMessage = exception.Message;
        if (exception.InnerException != null)
        {
            errorMessage += $" Inner: {exception.InnerException.Message}";
        }

        var response = new
        {
            error = errorMessage,
            statusCode = (int)statusCode,
            details = exception.InnerException?.Message
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

