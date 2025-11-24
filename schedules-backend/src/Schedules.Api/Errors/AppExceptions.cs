namespace Schedules.Errors;

public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class NotFoundException(string message) : AppException(ErrorCodes.NotFound, message);

public sealed class ConflictException(string message) : AppException(ErrorCodes.ScheduleConflict, message);

public sealed class ValidationAppException(string message) : AppException(ErrorCodes.ValidationError, message);

