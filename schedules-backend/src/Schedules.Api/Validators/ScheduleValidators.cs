using FluentValidation;
using Schedules.Contracts.Schedules;

namespace Schedules.Validators;

public class ScheduleQueryValidator : AbstractValidator<ScheduleQuery>
{
    public ScheduleQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.Size).InclusiveBetween(1, 100);
        RuleFor(x => x).Must(HaveValidRange)
            .WithMessage("RangeStart and RangeEnd must be provided together.");
    }

    private static bool HaveValidRange(ScheduleQuery query)
    {
        return query.RangeStart.HasValue == query.RangeEnd.HasValue
               ? query.RangeStart <= query.RangeEnd
               : !query.RangeStart.HasValue && !query.RangeEnd.HasValue;
    }
}

public class CreateScheduleRequestValidator : AbstractValidator<CreateScheduleRequest>
{
    public CreateScheduleRequestValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.StartTime).LessThan(x => x.EndTime);
        RuleFor(x => x.EndTime).GreaterThan(x => x.StartTime);
        When(x => x.CreateRecurrence, () =>
        {
            RuleFor(x => x.Recurrence).NotNull();
        });
    }
}

public class UpdateScheduleRequestValidator : AbstractValidator<UpdateScheduleRequest>
{
    public UpdateScheduleRequestValidator()
    {
        RuleFor(x => x).Must(HasAtLeastOneField)
            .WithMessage("At least one field must be provided.");
        When(x => x.StartTime.HasValue && x.EndTime.HasValue, () =>
        {
            RuleFor(x => x.StartTime!.Value).LessThan(x => x.EndTime!.Value);
        });
    }

    private static bool HasAtLeastOneField(UpdateScheduleRequest request) =>
        request.Title is not null ||
        request.Description is not null ||
        request.StartTime.HasValue ||
        request.EndTime.HasValue ||
        request.IsAllDay.HasValue ||
        request.Recurrence is not null ||
        request.Cancel.HasValue;
}

