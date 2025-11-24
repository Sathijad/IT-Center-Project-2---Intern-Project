using AutoMapper;
using Schedules.Api.Contracts.Tasks;
using Schedules.Api.Domain.Entities;

namespace Schedules.Api.Mapping;

public class TaskProfile : Profile
{
    public TaskProfile()
    {
        CreateMap<TaskEntity, TaskDto>();
        CreateMap<TaskNote, TaskNoteDto>();
    }
}

