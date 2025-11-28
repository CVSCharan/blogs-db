# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- PostgreSQL schema with Prisma
- MongoDB schemas with Mongoose
- Complete type definitions
- Connection management
- Migration support

## [1.0.0] - 2025-01-28

### Added
- **PostgreSQL (Prisma)**
  - User, Profile, Session models (Auth domain)
  - Post, Category, Tag, Comment, Like, Bookmark models (Content domain)
  - Media, MediaVariant models (Media domain)
  - Complete indexes for performance
  - Enum types for status fields

- **MongoDB (Mongoose)**
  - PageView schema for analytics
  - Notification schema for multi-channel notifications
  - AuditLog schema for compliance tracking
  - TTL indexes for automatic data cleanup

- **Infrastructure**
  - Prisma client singleton
  - MongoDB connection manager
  - TypeScript type exports
  - Graceful shutdown handling

- **Development Tools**
  - ESLint configuration
  - Prettier configuration
  - Jest testing setup
  - Migration scripts

### Documentation
- Comprehensive README
- Architecture documentation
- Database schema documentation
- Implementation plan

[Unreleased]: https://github.com/your-org/blogs-db/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/blogs-db/releases/tag/v1.0.0
