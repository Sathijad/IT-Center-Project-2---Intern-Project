using System.Security.Claims;

namespace Schedules.Api.Security;

public interface IUserContext
{
    long UserId { get; }
    string? Email { get; }
    bool IsInRole(string role);
}

public class UserContext(IHttpContextAccessor accessor) : IUserContext
{
    private readonly ClaimsPrincipal? _principal = accessor.HttpContext?.User;

    public long UserId => TryGetClaim("app_user_id")
        ?? TryGetClaim(ClaimTypes.NameIdentifier)
        ?? 0;

    public string? Email => _principal?.FindFirstValue(ClaimTypes.Email);

    public bool IsInRole(string role) => _principal?.IsInRole(role) ?? false;

    private long? TryGetClaim(string claimType)
    {
        var value = _principal?.FindFirstValue(claimType);
        return long.TryParse(value, out var id) ? id : null;
    }
}

