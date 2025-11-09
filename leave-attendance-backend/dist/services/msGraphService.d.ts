import { LeaveRepository } from '../repositories/leaveRepository';
export declare class MsGraphService {
    private readonly leaveRepository;
    private readonly sqsClient;
    constructor(leaveRepository?: LeaveRepository);
    enqueueCalendarSync(requestId: number): Promise<void>;
    syncLeaveRequest(requestId: number): Promise<void>;
}
