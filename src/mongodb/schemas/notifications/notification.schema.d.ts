import { Document } from 'mongoose';
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
export declare const NotificationModel: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=notification.schema.d.ts.map