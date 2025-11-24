namespace Schedules.Api.Infrastructure.Exceptions;

public class ApiException(string errorCode, string message, int statusCode = StatusCodes.Status400BadRequest)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
    public int StatusCode { get; } = statusCode;
}

public class NotFoundException(string message)
    : ApiException("NOT_FOUND", message, StatusCodes.Status404NotFound);

public class ConflictException(string message)
    : ApiException("SCHEDULE_CONFLICT", message, StatusCodes.Status409Conflict);

