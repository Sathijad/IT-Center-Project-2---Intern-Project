namespace Schedules.Api.Contracts;

public record PagedResponse<T>(IReadOnlyCollection<T> Data, int Page, int Size, int Total);

