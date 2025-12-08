# LeadDeskBatch Application Architecture

BiteWare Internal Documentation  
Last Updated: December 8, 2025

---

## Overview

LeadDeskBatch (LD5) is a Next.js 15 application for batch processing dental practice enrichment. It enables CSV upload of practice URLs, processes them through an external n8n workflow pipeline, and provides multi-format export capabilities (CSV, Excel, JSON).

---

## 2. High-Level Flow

```
Frontend (CSV Upload)
        ↓ cookies
API Layer (/api/jobs)
        ↓ creates job + practices
Supabase DB
        ↓ triggers
n8n Dispatcher
        ↓ per practice
URL Worker → Scraper Worker → Aggregator
        ↓ updates
Supabase DB (final_payload)
        ↓
Frontend (Export)
```

---

## 3. Database Schema

### 3.1 enrichment_jobs

Top-level job record created on CSV upload.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| original_filename | text | Uploaded CSV name |
| total_practices | int | Count of practices |
| completed_practices | int | Finished count |
| status | text | pending / running / completed / error |
| error_message | text | Job-level error |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.2 job_practices

Individual practice records within a job.

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | PK |
| job_id | uuid | FK → enrichment_jobs |
| practice_identifier | text | URL or identifier |
| status | text | pending / url_complete / scraped / aggregated / error |
| url_worker_payload | jsonb | Output from URL worker |
| scraper_worker_payload | jsonb | Output from Scraper worker |
| final_payload | jsonb | Merged final data |
| error_message | text | Practice-level error |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.3 failed_jobs

Workflow-level error logging for debugging.

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | PK |
| failed_workflow_id | text | n8n workflow ID |
| failed_workflow_name | text | Workflow name |
| failed_execution_id | text | n8n execution ID |
| error_message | text | Error description |
| error_stack | text | Stack trace |
| original_input_data | jsonb | Input that caused failure |
| status | text | Status of the failure record |
| logged_at | timestamp | |

### 3.4 users

| Column | Type |
|--------|------|
| id | uuid |
| email | text |
| password_hash | text |
| name | text |
| created_at | timestamp |
| updated_at | timestamp |

---

## 4. Status Values

### Job Status (enrichment_jobs.status)

| Status | Meaning |
|--------|---------|
| pending | Job created, no practices started |
| running | At least one practice in progress |
| completed | All practices finished |
| error | Job-level failure |

### Practice Status (job_practices.status)

| Status | Meaning |
|--------|---------|
| pending | Queued, not started |
| url_complete | URL worker finished |
| scraped | Scraper worker finished |
| aggregated | Aggregator finished (terminal) |
| error | Failed at any stage (terminal) |

---

## 5. n8n Workflows

### 5.1 Batch Dispatcher

Triggered by: `POST /api/jobs` via `LD5_DISPATCHER_WEBHOOK_URL`

**Input:** job_id, practices array

**Nodes:**
1. Webhook — Receive trigger from API
2. Code — Extract job_id and practices
3. Loop — Iterate practices
4. HTTP Request — Trigger URL Worker per practice
5. Supabase — Update job status to `running`

**Output:** Triggers URL Worker for each practice

---

### 5.2 URL Worker

**Input:** job_id, practice_id, practice_identifier

**Responsibilities:**
- Normalize & validate URL
- Deduplicate
- Sanitize fields

**Output:**
- Updates `job_practices.url_worker_payload`
- Updates `job_practices.status` → `url_complete`
- Triggers Scraper Worker

---

### 5.3 Scraper Worker

**Input:** job_id, practice_id, url_worker_payload

**Responsibilities:**
- Perform web scraping
- Extract practice metadata
- Structure enrichment data

**Output:**
- Updates `job_practices.scraper_worker_payload`
- Updates `job_practices.status` → `scraped`
- Triggers Aggregator

---

### 5.4 Batch Aggregator

**Input:** job_id, practice_id

**Responsibilities:**
- Merge url_worker_payload + scraper_worker_payload
- Write final_payload
- Increment completed_practices on job
- Check if all practices done → mark job completed

**Output:**
- Updates `job_practices.final_payload`
- Updates `job_practices.status` → `aggregated`
- Updates `enrichment_jobs.completed_practices`
- Updates `enrichment_jobs.status` → `completed` (when all done)

---

## 6. API Endpoints

All endpoints use cookie-based auth and RLS-safe Supabase server client.

### POST /api/jobs
- Accepts CSV upload
- Creates `enrichment_jobs` record
- Creates `job_practices` records
- Triggers Dispatcher webhook
- Returns: `{ job_id, total_practices }`

### GET /api/jobs
- Returns user's jobs list

### GET /api/jobs/[id]
- Returns job detail with practice statuses

### GET /api/jobs/[id]/export
- Generates CSV from final_payload data
- RLS ensures owner-only access

### POST /api/kill-job
- Params: `job_id`
- Sets job status to `error`

### POST /api/redo-job
- Params: `job_id`
- Resets `error` practices to `pending` in DB
- Re-triggers dispatcher

### GET /api/check-job-status
- Params: `job_id`
- Returns practice counts by status

### POST /api/save-excluded-job
- Uses LD5 tables for exclusion logic

---

## 7. Frontend Components

### Job Tables
- `batch-jobs-table.tsx` — List view
- `jobs-table.tsx` — Alternative list view
- Status display: running (not processing), error (not failed)

### Job Detail
- `jobs/[id]/page.tsx` — Single job view
- `job-header.tsx` — Status header
- Polls while status === `running`

### API Calls
- Use `job_id` parameter (not correlation_id)

---

## 8. Authentication

Cookie-based auth exclusively.

- Frontend: `createBrowserClient()`
- API routes: `createServerClient()`
- All requests include `credentials: "include"`
- RLS policies enforce user isolation

---

## 9. Environment Variables

| Variable | Purpose |
|----------|---------|
| LD5_DISPATCHER_WEBHOOK_URL | n8n dispatcher trigger URL |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Public key for frontend |
| SUPABASE_SERVICE_ROLE_KEY | Service key for n8n |

---

## 10. Data Flow Summary

```
CSV Upload
    ↓
enrichment_jobs (status: pending)
job_practices[] (status: pending)
    ↓
Dispatcher triggers URL Worker per practice
    ↓
URL Worker
  → url_worker_payload
  → status: url_complete
    ↓
Scraper Worker
  → scraper_worker_payload
  → status: scraped
    ↓
Aggregator
  → final_payload
  → status: aggregated
  → completed_practices++
    ↓
All done? → job status: completed
    ↓
Export CSV from final_payload
```

---

## 11. Error Handling

**Practice-level errors:**
- Set `job_practices.status` → `error`
- Set `job_practices.error_message`
- Continue processing other practices

**Job-level errors:**
- Set `enrichment_jobs.status` → `error`
- Set `enrichment_jobs.error_message`

**Workflow errors:**
- Log to `failed_jobs` table
- Include workflow ID, execution ID, input data, stack trace

**Redo logic:**
- `redo-job` resets error practices to pending
- Re-triggers dispatcher for failed practices only

---

## 12. Key Differences from Legacy Docs

| Old (LD3/LD4 docs) | New (LD5) |
|--------------------|-----------|
| enrichment_batches | job_practices |
| enrichment_leads | final_payload column |
| run_id / correlation_id | job_id |
| processing | running |
| failed | error |
| batch_jobs | enrichment_jobs |
| lead_batches | job_practices |

---

# End of Document
