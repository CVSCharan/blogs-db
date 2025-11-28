import { Document } from 'mongoose';
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
export declare const PageViewModel: import("mongoose").Model<IPageView, {}, {}, {}, Document<unknown, {}, IPageView, {}, {}> & IPageView & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=page-view.schema.d.ts.map