import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  relatedEntity?: {
    id: string;
    type: string;
  };
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  channels: {
    inApp: {
      enabled: boolean;
      read: boolean;
      readAt?: Date;
    };
    email: {
      enabled: boolean;
      sent: boolean;
      sentAt?: Date;
      emailId?: string;
    };
    push: {
      enabled: boolean;
      sent: boolean;
      sentAt?: Date;
      pushId?: string;
    };
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String },
    actionText: { type: String },
    relatedEntity: {
      id: { type: String },
      type: { type: String },
    },
    actorId: { type: String },
    actorName: { type: String },
    actorAvatar: { type: String },
    channels: {
      inApp: {
        enabled: { type: Boolean, default: true },
        read: { type: Boolean, default: false },
        readAt: { type: Date },
      },
      email: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        emailId: { type: String },
      },
      push: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        pushId: { type: String },
      },
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
  },
  {
    timestamps: false,
    collection: 'notifications',
  }
);

// Compound indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, 'channels.inApp.read': 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });

// TTL index - auto-delete after expiration
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const NotificationModel = model<INotification>('Notification', NotificationSchema);
