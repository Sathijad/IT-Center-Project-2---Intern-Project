interface SQSEventRecord {
    messageId: string;
    body: string;
}
interface SQSEvent {
    Records: SQSEventRecord[];
}
export declare const handler: (event: SQSEvent) => Promise<void>;
export {};
