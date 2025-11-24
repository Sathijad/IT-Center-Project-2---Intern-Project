using FluentValidation;
using Schedules.Contracts.Tasks;

namespace Schedules.Validators;

public class TaskQueryValidator : AbstractValidator<TaskQuery>
{
    public TaskQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.Size).InclusiveBetween(1, 100);
    }
}

public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(160);
        RuleFor(x => x.AssigneeId).GreaterThan(0);
        RuleFor(x => x.Tags).Must(tags => tags.Length <= 10)
            .WithMessage("Up to 10 tags are allowed.");
    }
}

public class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x).Must(HasChanges)
            .WithMessage("At least one field must be provided.");
    }

    private static bool HasChanges(UpdateTaskRequest request) =>
        request.Title is not null ||
        request.Description is not null ||
        request.Priority.HasValue ||
        request.Status.HasValue ||
        request.DueDate.HasValue ||
        request.Tags is not null;
}

public class CreateTaskNoteRequestValidator : AbstractValidator<CreateTaskNoteRequest>
{
    public CreateTaskNoteRequestValidator()
    {
        RuleFor(x => x.Body).NotEmpty().MaximumLength(2000);
    }
}

