namespace Performance.Contracts.Training;

public record NotifyStaffRequest(
    Guid[]? AssignmentIds,
    long? UserId,
    long? TeamId,
    bool? OverdueOnly,
    bool? IncompleteOnly
);

