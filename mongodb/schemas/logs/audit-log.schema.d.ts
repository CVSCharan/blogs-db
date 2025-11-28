import { Document } from 'mongoose';
export interface IAuditLog extends Document {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    action: string;
    resource: string;
    resourceId: string;
    changes?: {
        before: Record<string, unknown>;
        after: Record<string, unknown>;
    };
    ipAddress: string;
    userAgent: string;
    method?: string;
    endpoint?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    timestamp: Date;
}
export declare const AuditLogModel: import("mongoose").Model<IAuditLog, {}, {}, {}, Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=audit-log.schema.d.ts.map