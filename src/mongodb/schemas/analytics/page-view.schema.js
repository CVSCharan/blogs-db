"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageViewModel = void 0;
const mongoose_1 = require("mongoose");
const PageViewSchema = new mongoose_1.Schema({
    postId: { type: String, required: true, index: true },
    postSlug: { type: String, required: true },
    userId: { type: String, index: true },
    sessionId: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    device: {
        type: {
            type: String,
            enum: ['mobile', 'tablet', 'desktop'],
            required: true,
        },
        os: { type: String, required: true },
        browser: { type: String, required: true },
    },
    timeSpent: { type: Number },
    scrollDepth: { type: Number },
    interacted: { type: Boolean, default: false },
    referrer: { type: String },
    source: { type: String, required: true },
    campaign: { type: String },
    medium: { type: String },
    geo: {
        country: { type: String },
        city: { type: String },
        timezone: { type: String },
    },
    timestamp: { type: Date, default: Date.now, index: true },
    exitedAt: { type: Date },
}, {
    timestamps: false,
    collection: 'pageViews',
});
// Compound indexes
PageViewSchema.index({ postId: 1, timestamp: -1 });
PageViewSchema.index({ userId: 1, timestamp: -1 });
PageViewSchema.index({ 'device.type': 1 });
// TTL index - auto-delete after 90 days
PageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
exports.PageViewModel = (0, mongoose_1.model)('PageView', PageViewSchema);
//# sourceMappingURL=page-view.schema.js.map