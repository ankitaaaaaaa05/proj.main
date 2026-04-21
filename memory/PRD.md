# TaskFlow - Scalable REST API with Auth & RBAC

## Original Problem Statement
Build a Scalable REST API with Authentication & Role-Based Access, with a React frontend for testing APIs. Core features: JWT auth with bcrypt, role-based access (user/admin), CRUD for Tasks, API versioning, Swagger docs, input validation, brute force protection.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Auth**: JWT httpOnly cookies + bcrypt password hashing
- **API Versioning**: /api/v1/ prefix
- **Docs**: Swagger UI at /api/docs

## User Personas
1. **Regular User**: Register, login, manage own tasks (CRUD)
2. **Admin**: All user capabilities + manage all tasks + user management (CRUD users, role changes)

## Core Requirements
- [x] User registration & login with JWT + bcrypt
- [x] Role-based access (user vs admin)
- [x] Task CRUD with status/priority/due date
- [x] Admin: user management, role changes, create admins
- [x] API versioning (/api/v1/)
- [x] Swagger documentation
- [x] Brute force protection
- [x] Input validation (Pydantic)
- [x] Frontend: Login, Register, Dashboard, Admin Panel
- [x] Toast notifications for all actions
- [x] Task filtering by status and priority
- [x] Stats dashboard

## What's Been Implemented (April 16, 2026)
### Backend
- Auth: register, login, logout, me, refresh, register-admin
- Tasks: list (filtered), create, read, update, delete
- Admin: list users, delete user, change role
- Stats: task counts by status
- Brute force protection (5 attempts = 15min lockout)
- MongoDB indexes (email unique, task id unique)
- Admin seeding on startup

### Frontend
- Split-screen login/register pages
- Protected dashboard with stats + task grid + filters
- Admin panel with user management table
- Task create/edit dialog with status/priority/due date
- Navbar with role-based navigation
- Swiss high-contrast design (Chivo + IBM Plex Sans)

## Test Results
- Backend: 22/22 tests passed (100%)
- Frontend: 17/17 UI tests passed (100%)

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1 (Nice to have)
- Password reset (forgot password flow)
- Task search by title
- Pagination for tasks and users lists
- Task due date notifications

### P2 (Future)
- Caching with Redis
- Rate limiting middleware
- Docker deployment config
- Task categories/tags
- Task assignment (admin assigns to users)
- Activity audit log

## Next Tasks
1. Add password reset flow (email-based)
2. Add task search functionality
3. Add pagination for large datasets
4. Consider Redis caching for stats endpoint
