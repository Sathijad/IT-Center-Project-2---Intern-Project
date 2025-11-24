using FluentValidation;
using Schedules.Api.Contracts.Tasks;

namespace Schedules.Api.Validators;

public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
        RuleFor(x => x.AssigneeId).GreaterThan(0);
    }
}

public class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(150).When(x => x.Title is not null);
    }
}

public class CreateTaskCommentRequestValidator : AbstractValidator<CreateTaskCommentRequest>
{
    public CreateTaskCommentRequestValidator()
    {
        RuleFor(x => x.Body).NotEmpty();
    }
}

