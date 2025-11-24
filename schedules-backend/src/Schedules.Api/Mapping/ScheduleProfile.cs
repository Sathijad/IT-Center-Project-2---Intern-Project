using AutoMapper;
using Schedules.Contracts.Schedules;
using Schedules.Contracts.Tasks;
using Schedules.Domain.Entities;

namespace Schedules.Mapping;

public class ScheduleProfile : Profile
{
    public ScheduleProfile()
    {
        CreateMap<Schedule, ScheduleResponse>()
            .ForMember(dest => dest.ScheduleId, opt => opt.MapFrom(src => src.ScheduleId))
            .ForMember(dest => dest.Recurrence,
                opt => opt.MapFrom(src => src.Recurrence == null
                    ? null
                    : new RecurrenceDto(
                        src.Recurrence.RecurrencePatternId,
                        src.Recurrence.Pattern,
                        src.Recurrence.Interval,
                        src.Recurrence.ByDay,
                        src.Recurrence.ByMonthDay,
                        src.Recurrence.Until)));

        CreateMap<TaskItem, TaskResponse>()
            .ForMember(dest => dest.TaskId, opt => opt.MapFrom(src => src.TaskItemId));

        CreateMap<TaskNote, TaskNoteResponse>()
            .ForMember(dest => dest.NoteId, opt => opt.MapFrom(src => src.TaskNoteId));
    }
}

