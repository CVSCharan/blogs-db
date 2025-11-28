"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = void 0;
const mongoose_1 = require("mongoose");
const AuditLogSchema = new mongoose_1.Schema({
    userId: { type: String, index: true },
    userEmail: { type: String },
    userRole: { type: String },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String, required: true },
    changes: {
        before: { type: mongoose_1.Schema.Types.Mixed },
        after: { type: mongoose_1.Schema.Types.Mixed },
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
}, {
    timestamps: false,
    collection: 'auditLogs',
});
// Compound indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
// TTL index - keep audit logs for 2 years (compliance)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });
exports.AuditLogModel = (0, mongoose_1.model)('AuditLog', AuditLogSchema);
//# sourceMappingURL=audit-log.schema.js.map