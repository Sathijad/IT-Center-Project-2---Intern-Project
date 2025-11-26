using Microsoft.AspNetCore.Authorization;
using Schedules.Controllers;
using System.Linq;
using System.Reflection;
using Xunit;

namespace Schedules.Api.Tests;

public class ControllerAttributeTests
{
    [Theory]
    [InlineData("Get", "AdminOnly")]
    [InlineData("GetMySchedules", "Employee")]
    [InlineData("Create", "AdminOnly")]
    [InlineData("Update", "AdminOnly")]
    [InlineData("Delete", "AdminOnly")]
    public void SchedulesController_EnforcesPolicies(string methodName, string expectedPolicy)
    {
        var method = typeof(SchedulesController).GetMethod(methodName);
        Assert.NotNull(method);

        var policy = GetAuthorizePolicy(method!);
        Assert.Equal(expectedPolicy, policy);
    }

    [Theory]
    [InlineData("ImportSchedules")]
    [InlineData("GetStatus")]
    public void ImportsController_RequiresAdminPolicy(string methodName)
    {
        var method = typeof(ImportsController).GetMethod(methodName);
        Assert.NotNull(method);

        var policy = GetAuthorizePolicy(method!);
        Assert.Equal("AdminOnly", policy);
    }

    private static string? GetAuthorizePolicy(MethodInfo method)
    {
        var attribute = method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();
        return attribute?.Policy;
    }
}

