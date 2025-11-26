using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Schedules.Services;

namespace Schedules.Configuration;

public class JwtClaimsTransformation(RoleService roleService) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        // Check if roles have already been added (avoid duplicate work)
        if (principal.HasClaim(c => c.Type == ClaimTypes.Role || c.Type == "role"))
        {
            return principal;
        }

        // Get the cognito sub claim
        var sub = principal.FindFirst("sub")?.Value
               ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var identity = principal.Identity as ClaimsIdentity;
        if (identity == null)
        {
            return principal;
        }

        if (string.IsNullOrEmpty(sub))
        {
            Console.WriteLine("[JwtClaimsTransformation] No 'sub' claim found, cannot load roles");
            // Default to EMPLOYEE if no sub found
            identity.AddClaim(new Claim(ClaimTypes.Role, "EMPLOYEE"));
            return principal;
        }

        // Load roles from database
        var roles = await roleService.GetUserRolesAsync(sub);

        // Add roles as claims
        foreach (var role in roles)
        {
            // Map EMPLOYEE to EMP for the authorization policy
            var roleName = role == "EMPLOYEE" ? "EMP" : role;
            identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
            Console.WriteLine($"[JwtClaimsTransformation] Added role claim: {roleName}");
        }

        return principal;
    }
}

