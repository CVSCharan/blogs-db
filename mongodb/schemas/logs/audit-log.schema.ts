import { Schema, model, Document } from 'mongoose';

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

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, index: true },
    userEmail: { type: String },
    userRole: { type: String },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String, required: true },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    method: { type: String },
    endpoint: { type: String },
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    errorMessage: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: 'auditLogs',
  }
);

// Compound indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// TTL index - keep audit logs for 2 years (compliance)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
