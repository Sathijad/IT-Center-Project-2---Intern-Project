namespace Performance.Contracts;

public record PagedResult<T>(IReadOnlyCollection<T> Items, int Page, int Size, int TotalCount);

