// Re-export all Prisma types for convenience
export type {
  User,
  Profile,
  Session,
  Post,
  Category,
  Tag,
  PostCategory,
  PostTag,
  Comment,
  Like,
  Bookmark,
  Media,
  MediaVariant,
  Prisma,
} from '@prisma/client';

export { UserRole, PostStatus, PostVisibility, CommentStatus, MediaStatus } from '@prisma/client';
