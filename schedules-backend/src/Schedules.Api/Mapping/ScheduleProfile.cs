using AutoMapper;
using Schedules.Contracts.Schedules;
using Schedules.Contracts.Tasks;
using Schedules.Domain.Entities;
using System.Linq;

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
                        src.Recurrence.Pattern ?? string.Empty,
                        src.Recurrence.Interval,
                        src.Recurrence.ByDay,
                        src.Recurrence.ByMonthDay,
                        src.Recurrence.Until)));

        CreateMap<RecurrencePattern, RecurrenceDto>()
            .ConstructUsing(src => new RecurrenceDto(
                src.RecurrencePatternId,
                src.Pattern ?? string.Empty,
                src.Interval,
                src.ByDay,
                src.ByMonthDay,
                src.Until));

        CreateMap<TaskNote, TaskNoteResponse>()
            .ConstructUsing(src => new TaskNoteResponse(src.TaskNoteId, src.AuthorId, src.Body, src.CreatedAt));

        CreateMap<TaskItem, TaskResponse>()
            .ConstructUsing(src => new TaskResponse(
                src.TaskItemId,
                src.Title,
                src.Description,
                src.AssigneeId,
                src.ScheduleId,
                src.Priority,
                src.Status,
                src.DueDate,
                src.Tags ?? Array.Empty<string>(),
                src.MsGraphItemId,
                src.CreatedAt,
                src.UpdatedAt,
                src.Notes != null && src.Notes.Any()
                    ? src.Notes.Select(n => new TaskNoteResponse(n.TaskNoteId, n.AuthorId, n.Body, n.CreatedAt)).ToList()
                    : new List<TaskNoteResponse>()));

    }
}

