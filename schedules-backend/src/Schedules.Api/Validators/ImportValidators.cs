using FluentValidation;
using Schedules.Contracts.Imports;

namespace Schedules.Validators;

public class ImportRequestValidator : AbstractValidator<ImportRequest>
{
    public ImportRequestValidator()
    {
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Base64Payload).NotEmpty();
    }
}

