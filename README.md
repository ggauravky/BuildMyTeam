# HackTeam Nexus

HackTeam Nexus is a production-oriented web platform for colleges to manage hackathons, teams, participants, and collaboration resources in one place.

It provides:
- Secure authentication with pending-user approval flow
- Role-based access for Admin, Team Leader, and Member
- Team creation, join-by-code, join-request review, and member management
- Team workspace with project links, QR join, and notifications
- Admin operations for users, teams, and hackathons

## Tech Stack

- Frontend: React (Vite), React Router, Tailwind CSS, TanStack Query
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Auth: JWT + bcrypt
- Validation: Zod
- Testing: Jest + Supertest + mongodb-memory-server (backend)

## Repository Structure

- `frontend/` React app (Vercel-ready)
- `backend/` Express API (Render-ready)
- `render.yaml` Render deployment blueprint for backend

## Core Features

- Authentication
  - User signup and login
  - Password hashing with bcrypt
  - JWT-based route protection
  - Pending status for new users
  - Admin approval/rejection for account activation

- Hackathons
  - Admin CRUD for hackathon listings
  - Public and authenticated listing
  - External-link redirect usage

- Team Management
  - Approved users can create teams
  - Team fields include project/resource links
  - Unique 4-5 digit join code per team
  - Join by code with approval/rejection workflow
  - Max team size enforcement
  - Remove members and transfer leadership

- Team Workspace
  - Team member roster
  - GitHub, Excalidraw, WhatsApp, and hackathon links
  - Leader-editable details
  - Join QR generation for team code sharing

- Notifications
  - Join request alerts
  - Approval/rejection alerts
  - Team update alerts
  - Read/unread tracking

- User Profile
  - Name, email, global role, status
  - Teams joined
  - Hackathons participated

- Admin Dashboard
  - View users, teams, and hackathons
  - Approve/reject users

- Discovery UX
  - Team search by name/project
  - Filter teams by hackathon

## Local Setup

## Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)

## 1) Clone and install

```bash
# from project root
cd backend
npm install

cd ../frontend
npm install
```

## 2) Configure environment variables

Create backend env file:

```bash
cd backend
cp .env.example .env
```

Set values in `backend/.env`:

- `NODE_ENV=development`
- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/hackteam_nexus`
- `JWT_SECRET=<your_secret>`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_URL=http://localhost:5173,http://localhost:5174`
- `ADMIN_SYNC_ON_STARTUP=true` (optional for local bootstrap only)

Create frontend env file:

```bash
cd frontend
cp .env.example .env
```

Set values in `frontend/.env`:

- `VITE_API_URL=http://localhost:5000/api`

## 3) Run the apps

In terminal 1:

```bash
cd backend
npm run dev
```

In terminal 2:

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Scripts

Backend (`backend/package.json`):
- `npm run dev` start with nodemon
- `npm start` production start
- `npm run lint` ESLint
- `npm test` Jest + Supertest API tests

Frontend (`frontend/package.json`):
- `npm run dev` Vite dev server
- `npm run build` production build
- `npm run preview` preview build
- `npm run lint` ESLint

## API Overview

Base URL: `http://localhost:5000/api`

Key route groups:
- `/auth` signup, login, me
- `/admin` users review/list, team/hackathon oversight
- `/hackathons` list + admin CRUD
- `/teams` create/list/edit/member ops/leader transfer/QR
- `/join-requests` request by code, pending review, approve/reject
- `/notifications` list/read/read-all
- `/profile` current user profile aggregate

## Admin Login And Portal Guide

Admin access is fully implemented.

- Login page: /login
- Admin portal route: /admin
- Access rule: only users with role=admin can open /admin

How admin account is created:

1. Automatic bootstrap:
- The very first signup in an empty database becomes admin and approved automatically.

2. Manual create/reset command:
- You can create a new admin or promote/reset an existing user at any time.

Command:

  cd backend
  npm run admin:create -- --name="Admin" --email="admin@college.edu" --password="StrongPass123!"

What this command does:

- If email exists: sets role to admin, status to approved, and resets password.
- If email does not exist: creates a new approved admin user.

Admin portal capabilities currently available:

- View all users
- Filter users by status
- Approve or reject pending users
- View all teams overview
- View all hackathons
- Create hackathons
- Edit hackathons
- Delete hackathons

Security notes for admin:

- Use a strong admin password.
- Never commit backend/.env.
- Rotate credentials if they are shared in logs or chat.

## Deployment

## Backend on Render

Use `render.yaml` in the project root.

Required Render env vars:
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL` (your Vercel frontend URL, comma-separated if needed)

Recommended Render env vars:
- `JWT_EXPIRES_IN=7d`
- `ADMIN_SYNC_ON_STARTUP=false`

Render deploy steps:

1. Push code to GitHub.
2. In Render dashboard, create a new Blueprint from repository.
3. Confirm service uses:
- Root directory: backend
- Build command: npm ci
- Start command: npm start
4. Set required environment variables in Render service.
5. Deploy and wait for build to complete.
6. Verify backend health URL:
- https://your-backend.onrender.com/health
7. Verify API base URL:
- https://your-backend.onrender.com/api/hackathons

## Frontend on Vercel

Two Vercel deployment modes are supported:

- Repository-root deployment (default-safe for this monorepo):
  - Uses root `vercel.json`
  - Runs `npm ci --prefix frontend` and `npm run build --prefix frontend`
  - Prevents `npm ci` lockfile errors at repository root
- Frontend-root deployment:
  - Set project Root Directory to `frontend`
  - Uses `frontend/vercel.json`

Vercel deploy steps:

1. Import the same repository in Vercel.
2. Choose one deployment mode:
- Keep Root Directory as repository root (recommended), or
- Set Root Directory to `frontend`.
3. Set environment variable:
- `VITE_API_URL=https://your-backend.onrender.com/api`
4. Build and deploy.
5. Open deployed app and test login/register.

Required Vercel env var:
- `VITE_API_URL=https://<your-render-backend>/api`

After frontend deploy, update backend `CLIENT_URL` in Render:

- `CLIENT_URL=https://your-frontend.vercel.app`

If you need preview deployments to call backend, add additional origins in `CLIENT_URL` separated by commas.

## Production Verification Checklist

1. Backend health endpoint returns 200.
2. Frontend loads without blank screen.
3. Register endpoint works from deployed frontend.
4. Admin login works and admin panel loads.
5. Create/edit/delete hackathon works.
6. Team create/edit/delete works for creator/admin.
7. Non-creator cannot edit/delete another team.
8. CORS has no browser errors in Network tab.

## Security Notes

- Passwords are hashed with bcrypt before storage
- Sensitive routes use JWT auth middleware
- Admin-only routes are protected with role middleware
- Pending users are blocked from approved-user actions
- Input payloads are validated with Zod
- Helmet, CORS, and rate limiting are enabled

## Testing

Backend test coverage includes:
- Pending approval restrictions
- RBAC on admin endpoints
- Join request validation and review flow

Run:

```bash
cd backend
npm test
```

## Production Checklist

- Set strong `JWT_SECRET`
- Use MongoDB Atlas or managed Mongo for production
- Set `CLIENT_URL` to deployed frontend domain
- Set `VITE_API_URL` to deployed backend API base
- Set `ADMIN_SYNC_ON_STARTUP=false` in production
- Keep `.env` files out of version control

## License

ISC
