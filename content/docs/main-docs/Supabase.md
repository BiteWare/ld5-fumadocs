# LeadDesk 5 – Supabase Architecture

## Tables

---

## `enrichment_jobs`
Tracks one batch job.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to users |
| original_filename | text | CSV name |
| total_practices | int | practice count |
| completed_practices | int | auto-updated |
| status | text | pending/processing/completed/failed |
| error_message | text | optional |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated |

---

## `job_practices`
Stores individual practice entries.

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | PK |
| job_id | uuid | FK to enrichment_jobs |
| practice_identifier | text | URL or identifier |
| status | text | pending → url_complete → scraped → aggregated |
| url_worker_payload | jsonb | URL worker output |
| scraper_worker_payload | jsonb | Scraper output |
| final_payload | jsonb | Aggregated final data |
| error_message | text | Any error |
| timestamps | auto |

---

## RLS Policies
- Users may only access their own `enrichment_jobs`
- Users may only access `job_practices` for owned jobs

---

## Triggers
Automatically:
- Update job timestamps
- Increment completed count when practice enters final state
- Set job status:
  - pending → processing
  - processing → completed
  - any practice error → failed

---

## Indexes
- job_practices(job_id)
- job_practices(status)
- enrichment_jobs(user_id)
- enrichment_jobs(created_at)
- job_practices(job_id, status) WHERE status='aggregated'

