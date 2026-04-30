# To-Do List Application

A full-stack To-Do List application with authentication built using React, TypeScript, Node.js, Express, and PostgreSQL with Prisma.

## Features

- User registration and login
- JWT-based authentication
- Create, read, update, delete tasks
- Mark tasks as completed

## Setup

### Backend

1. Navigate to `backend` directory
2. Install dependencies: `npm install`
3. Set up PostgreSQL database and update `.env` with your DATABASE_URL
4. Run Prisma migrations: `npm run prisma:migrate`
5. Generate Prisma client: `npm run prisma:generate`
6. Start the server: `npm run dev`

### Frontend

1. Navigate to `frontend` directory
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Usage

- Register a new account or login
- Add new tasks
- Mark tasks as completed
- Delete tasks