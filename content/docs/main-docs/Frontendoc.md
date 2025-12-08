# LeadDesk 5 – Frontend Architecture

## Overview
LeadDesk 5 (LD5) moves from single‑practice processing to a batch‑only system. The frontend is a dedicated Next.js App Router application that manages CSV upload, job creation, practice-level status tracking, and CSV export of aggregated enrichment data.

## Core Principles
- **Batch-first UI**: All interactions operate at the job level.
- **Supabase-authenticated**.
- **REST-driven** via `/api/jobs`.
- **Shadcn UI + Zyris branding**.
- **Polling architecture** for real-time updates.

---

## Pages

### `/jobs`
Displays user job history with:
- Job ID
- Filename
- Status pill
- Completed / total count
- Created timestamp

Implements:
- Search
- Sorting
- Loading skeletons

### `/jobs/new`
- CSV uploader (drag-and-drop)
- CSV preview (first 5 rows)
- File validation (CSV only)
- After upload → redirects to job detail

### `/jobs/[id]`
Real-time job page containing:
- Status pill
- Progress bar
- Export CSV button
- Practice table (URL, status, error, timestamps)
- Auto-polling via `useJobPolling`

Polling interval: **3 seconds**  
Stops when: `status = completed` or `failed`.

---

## Components
### `CsvUploader`
- Uses papaparse for client CSV preview
- Validates file extension & size
- Shows row count + file name
- Calls POST `/api/jobs`

### `JobHeader`
Contains:
- Job metadata (ID, filename)
- Status + progress bar
- Export button slot

### `PracticeTable`
Handles:
- Practice list
- Status badges
- Expandable errors
- Auto-scroll for large sets

### `ExportCsvButton`
- Enabled only on `completed`
- Downloads using `/api/jobs/{id}/export`

---

## Navigation
- Sidebar with: *Jobs*, *New Job*
- Home redirects to `/jobs/new`

---

## API Client (`LD-API-Client.ts`)
Provides:
- `uploadCsvJob`
- `getJobs`
- `getJobDetail`
- `exportJobCsv`

---

## Data Flow
1. User uploads CSV in `/jobs/new`.
2. Frontend calls **POST /api/jobs**.
3. Backend creates job + practices.
4. Page redirects to job detail.
5. Polling fetches **GET /api/jobs/{id}**.
6. Final CSV exported from **GET /api/jobs/{id}/export**.

