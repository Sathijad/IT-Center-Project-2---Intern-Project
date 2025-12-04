using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Performance.Api.Tests.Helpers;

public static class ControllerTestHelpers
{
    public static ClaimsPrincipal CreateClaimsPrincipal(string cognitoSub = "test-sub-123", string? userId = null)
    {
        var claims = new List<Claim>
        {
            new Claim("sub", cognitoSub)
        };

        if (!string.IsNullOrEmpty(userId))
        {
            claims.Add(new Claim("user_id", userId));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    public static void SetControllerContext(ControllerBase controller, ClaimsPrincipal? user = null)
    {
        var httpContext = new DefaultHttpContext
        {
            User = user ?? CreateClaimsPrincipal()
        };

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }
}

