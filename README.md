<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Online Voting System

This app uses a React frontend and a Java Spring Boot backend with MySQL persistence.

View your app in AI Studio: https://ai.studio/apps/58ff0045-4e1e-40ee-b63c-1538ac754951

## Run Locally

**Prerequisites:** Node.js, Java 21+, Maven, and MySQL running on port `3306`

1. Install frontend dependencies:
   `npm install`

2. Start MySQL using:
   - host: `localhost`
   - port: `3306`
   - username: `root`
   - password: empty / no password

   The backend connects to the database named `voting`.
   Spring Boot will create it automatically if your MySQL user allows `createDatabaseIfNotExist=true`.

3. Start the Java backend:
   `cd backend`
   `mvn spring-boot:run`

   If Maven reports that port `8080` is already in use, the backend is already running.
   Use the existing server or stop that process before starting a new one.

4. In another terminal, start the React frontend from the project root:
   `npm run dev`

5. Open the frontend:
   `http://localhost:5173`

   You can also open the Spring Boot server directly at `http://localhost:8080/`
   after running `npm run build`; the backend serves the built React app from `dist`.

The React dev server proxies `/api` requests to the Java backend at `http://localhost:8080`.

The optional Node server scripts (`npm run dev:node`, `npm run build:node`, and `npm start`) do not store application data. They only serve the frontend and proxy `/api` requests to the Spring Boot backend. Set `BACKEND_URL` if your Java backend is not running at `http://localhost:8080`.

Default accounts:

- `superadmin` / `admin123`
- `electionadmin` / `admin123`
- `alice_voter` / `voter123`

The Java backend stores app data in normalized MySQL tables for users, voters, parties, positions, candidates, elections, election mappings, votes, and audit logs. On first run, it creates the tables and seeds default demo data. The old root `database.json` file is not used by the web application.
