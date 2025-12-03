using Performance.Contracts.Training;

namespace Performance.Services.Interfaces;

public interface ITrainingAssignmentService
{
    Task<IReadOnlyCollection<AssignmentResponse>> AssignAsync(AssignTrainingRequest request, long actorId, CancellationToken cancellationToken);
    Task<AssignmentResponse> UpdateAsync(Guid assignmentId, UpdateAssignmentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AssignmentResponse>> GetByUserAsync(long userId, CancellationToken cancellationToken);
}

