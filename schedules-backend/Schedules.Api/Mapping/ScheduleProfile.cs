using AutoMapper;
using Schedules.Api.Contracts.Schedules;
using Schedules.Api.Domain.Entities;

namespace Schedules.Api.Mapping;

public class ScheduleProfile : Profile
{
    public ScheduleProfile()
    {
        CreateMap<Schedule, ScheduleDto>()
            .ForMember(dest => dest.Recurrence, opt => opt.MapFrom(src => src.Recurrence));

        CreateMap<Recurrence, RecurrenceDto>()
            .ForMember(dest => dest.ByDay, opt => opt.MapFrom(src => src.ByDay == null ? null : src.ByDay.Split(',', StringSplitOptions.RemoveEmptyEntries)));

        CreateMap<RecurrenceUpsertRequest, Recurrence>()
            .ForMember(dest => dest.ByDay, opt => opt.MapFrom(src => src.ByDay == null ? null : string.Join(',', src.ByDay)));
    }
}

