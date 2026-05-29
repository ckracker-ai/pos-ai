# SVM Core API

Core API for the SVM system. This repository contains the backend service for authentication, inventory, sales, and related domain logic.

## Commands

- `npm install`
- `npm run build`
- `npm start`
- `npm run dev`
- `npm run db:sync`

## Environment

Copy `.env.example` to `.env` and update database credentials and `INTERNAL_API_KEY`.

## Docker

Build and run the production image:

- `docker build -t svm-core-api .`
- `docker run --env-file .env -p 4000:4000 svm-core-api`

Or start the stack with Docker Compose:

- `docker compose up --build`
- `docker compose down`

Use npm shortcuts:

- `npm run docker:build`
- `npm run docker:run`
- `npm run compose:build`
- `npm run compose:up`
- `npm run compose:down`
- `npm run compose:logs`

The compose setup uses `core_api` and `db`, with the API exposed only on `127.0.0.1:${CORE_PORT:-4000}`.
