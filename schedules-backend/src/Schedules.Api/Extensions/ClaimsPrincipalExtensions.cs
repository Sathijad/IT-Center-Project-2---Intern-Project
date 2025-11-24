using System.Security.Claims;

namespace Schedules.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static long GetActorId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirst("custom:user_id")?.Value ??
                    principal.FindFirst("employee_id")?.Value ??
                    principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return long.TryParse(value, out var id) ? id : 0;
    }
}

