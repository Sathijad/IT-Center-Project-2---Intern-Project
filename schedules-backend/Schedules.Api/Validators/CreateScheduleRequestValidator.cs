using FluentValidation;
using Schedules.Api.Contracts.Schedules;

namespace Schedules.Api.Validators;

public class CreateScheduleRequestValidator : AbstractValidator<CreateScheduleRequest>
{
    public CreateScheduleRequestValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.StartTime).LessThan(x => x.EndTime);
        RuleFor(x => x.Recurrence).SetValidator(new RecurrenceUpsertRequestValidator()!).When(x => x.Recurrence is not null);
    }
}

public class RecurrenceUpsertRequestValidator : AbstractValidator<RecurrenceUpsertRequest>
{
    public RecurrenceUpsertRequestValidator()
    {
        RuleFor(x => x.Pattern).NotEmpty();
        RuleFor(x => x.Timezone).NotEmpty();
        RuleFor(x => x.Interval).GreaterThan((short)0);
    }
}

