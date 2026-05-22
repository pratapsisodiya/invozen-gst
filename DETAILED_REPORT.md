# Invozen GST - Critical Issues & Detailed Remediation Plan

This report provides a detailed breakdown of the critical issues preventing the Invozen GST project from building and running successfully. It outlines specific sub-issues and provides exact, step-by-step remediation actions for each.

---

## 1. Backend Database Configuration Mismatch

**The Core Issue:** The application is stuck between SQLite and PostgreSQL. `backend/prisma/schema.prisma` is configured for PostgreSQL (which is required because the schema uses `JsonB` types), but `backend/.env` is providing a SQLite connection string.

### Sub-Issues & Steps to Fix

**1A. Unify on PostgreSQL**
*   **Context:** The `migrate-to-postgres.ts` script indicates the project's intention is to use PostgreSQL. Since the schema relies on PostgreSQL-specific features (`JsonB`), reverting to SQLite is not viable without modifying the schema.
*   **Action:** Update the backend environment variables to point to a valid PostgreSQL database.
*   **Step 1:** Open `backend/.env`.
*   **Step 2:** Change `DATABASE_URL` from `file:./invozen.db` to a valid PostgreSQL connection string.
    ```env
    # Change this:
    DATABASE_URL="file:./invozen.db"
    
    # To this (replace credentials with your actual local/remote Postgres DB):
    DATABASE_URL="postgresql://user:password@localhost:5432/invozen?schema=public"
    ```
*   **Step 3:** Run Prisma migrations to initialize the new database: `cd backend && npx prisma db push` (or `migrate dev`).

---

## 2. Broken Frontend API Routes

**The Core Issue:** The project migrated business logic from Next.js API routes (`frontend/app/api/`) to a standalone Express backend (`backend/src/routes/`). However, 11 Next.js API routes were left behind, attempting to import from a deleted `@/backend/repositories/` folder.

### Sub-Issues & Steps to Fix

**2A. Redundant API Routes (Delete)**
*   **Context:** Routes like Business, Customers, Items, and Payments have already been implemented in the Express backend. The Next.js API routes for these entities are dead code causing build failures.
*   **Action:** Delete the obsolete Next.js API routes.
*   **Step 1:** Delete the following files/folders from the frontend:
    *   `frontend/app/api/business/`
    *   `frontend/app/api/customers/`
    *   `frontend/app/api/invoices/route.ts` (Keep specific sub-routes if needed, see 2B)
    *   `frontend/app/api/items/`
    *   `frontend/app/api/payments/`

**2B. Stranded Business Logic (Migrate)**
*   **Context:** The `frontend/app/api/invoices/[id]/send-email/route.ts` contains critical email-sending logic (using Resend/SMTP) that was *not* migrated to the Express backend.
*   **Action:** Migrate the email-sending logic to the Express backend.
*   **Step 1:** Create a new route in the backend: `backend/src/routes/email.ts`.
*   **Step 2:** Port the logic from the Next.js `send-email/route.ts` to the new Express route.
*   **Step 3:** Update `backend/src/index.ts` to register the new `/api/v1/email` route.
*   **Step 4:** Delete `frontend/app/api/invoices/[id]/send-email/route.ts`.
*   **Step 5:** Ensure frontend components call the Express backend (`/api/v1/...`) instead of the Next.js API (`/api/...`) for these actions.

---

## 3. Mobile API Connectivity

**The Core Issue:** The mobile app is pointing to the wrong URL, uses an incompatible local URL for emulators, and sends an invalid authentication token.

### Sub-Issues & Steps to Fix

**3A. Incorrect API Base URL**
*   **Context:** `mobile/src/services/api/client.ts` sets `API_BASE_URL` to the Next.js frontend (`http://localhost:3000/api`) instead of the Express backend (`http://localhost:4000/api/v1`).
*   **Action:** Update the Base URL.
*   **Step 1:** Open `mobile/src/services/api/client.ts`.
*   **Step 2:** Change the URL.
    ```typescript
    // Change this:
    export const API_BASE_URL = 'http://localhost:3000/api';
    
    // To this (Use 10.0.2.2 for Android emulators connecting to localhost):
    export const API_BASE_URL = 'http://10.0.2.2:4000/api/v1'; 
    ```

**3B. Invalid Authentication Header**
*   **Context:** The mobile API client currently sends a simple user ID as the Bearer token (`Authorization: Bearer ${user.id}`). The Express backend uses Clerk for authentication and expects a valid Clerk JWT.
*   **Action:** Integrate Clerk into the mobile app to fetch valid tokens.
*   **Step 1:** Install `@clerk/clerk-expo` in the mobile app.
*   **Step 2:** Update `mobile/src/services/api/client.ts` to use `useAuth().getToken()` from Clerk to set the Authorization header dynamically before making requests.

---

## 4. Missing/Placeholder Credentials

**The Core Issue:** Both the frontend and backend fail to start or function correctly without required third-party API keys and configuration values.

### Sub-Issues & Steps to Fix

**4A. Backend Mandatory Keys**
*   **Context:** `backend/src/config.ts` enforces `DATABASE_URL` and `CLERK_SECRET_KEY`.
*   **Action:** Provide valid keys in `backend/.env`.
*   **Step 1:** Open `backend/.env`.
*   **Step 2:** Ensure the following are set:
    ```env
    PORT=4000
    DATABASE_URL="postgresql://user:password@localhost:5432/invozen?schema=public"
    CLERK_SECRET_KEY="sk_test_..." # Get from Clerk Dashboard
    
    # Optional but needed for full feature set:
    RESEND_API_KEY="..."
    GROQ_API_KEY="..."
    ```

**4B. Frontend Mandatory Keys**
*   **Context:** The frontend relies on Clerk for user authentication.
*   **Action:** Provide the Clerk Publishable Key in `frontend/.env.local`.
*   **Step 1:** Create or open `frontend/.env.local`.
*   **Step 2:** Add the publishable key:
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..." # Get from Clerk Dashboard
    NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1" # Point to local Express server
    ```
