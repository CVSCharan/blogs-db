import { Schema, model, Document } from 'mongoose';

export interface IPageView extends Document {
  postId: string;
  postSlug: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
  };
  timeSpent?: number;
  scrollDepth?: number;
  interacted: boolean;
  referrer?: string;
  source: string;
  campaign?: string;
  medium?: string;
  geo?: {
    country: string;
    city: string;
    timezone: string;
  };
  timestamp: Date;
  exitedAt?: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
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
  },
  {
    timestamps: false,
    collection: 'pageViews',
  }
);

// Compound indexes
PageViewSchema.index({ postId: 1, timestamp: -1 });
PageViewSchema.index({ userId: 1, timestamp: -1 });
PageViewSchema.index({ 'device.type': 1 });

// TTL index - auto-delete after 90 days
PageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const PageViewModel = model<IPageView>('PageView', PageViewSchema);
