using AutoMapper;
using Schedules.Api.Contracts.Imports;
using Schedules.Api.Domain.Entities;

namespace Schedules.Api.Mapping;

public class ImportProfile : Profile
{
    public ImportProfile()
    {
        CreateMap<ImportJob, ImportJobDto>();
    }
}

