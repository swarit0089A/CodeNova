# CodeNova

CodeNova is a full-stack coding practice platform with:

- a React frontend
- an Express backend
- MongoDB for persistent users/problems/submissions
- a local code runner for the IDE

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run devStart
```

The frontend reads `VITE_API_BASE_URL` from `frontend/.env`.

## Production deployment

This repo is now prepared for a single-service Render deployment from GitHub:

- `Dockerfile` builds the frontend and runs the backend
- `render.yaml` defines the Render web service
- the backend serves the built React app in production
- the backend refuses to use ephemeral JSON storage in production, so user data does not disappear after redeploys

### Required production env vars

- `MONGODB_URI`
- `SECRET_TOKEN` (Render can auto-generate this from `render.yaml`)

Use a persistent MongoDB database such as MongoDB Atlas. Include the database name directly in the URI, or set `MONGODB_DB_NAME` separately if needed.

### Render deploy steps

1. Push this repo to GitHub.
2. Create a MongoDB Atlas database and copy its connection string.
3. In Render, choose `New +` -> `Blueprint`.
4. Connect your GitHub repo.
5. Render will detect `render.yaml`.
6. Set `MONGODB_URI` in the Render dashboard when prompted.
7. Deploy.

After deploy, your app will be available on the Render service URL.

## Notes

- Local Docker runner startup is disabled in production because the hosted build uses the in-container local runner.
- If MongoDB is not configured in production, the app exits instead of silently writing to temporary local files.
