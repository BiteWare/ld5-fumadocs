# LeadDesk 5 – Backend Architecture

## Overview
The backend is implemented using **Next.js API routes**, Supabase client-side authentication, Postgres (via Supabase), and n8n as the async workflow engine.

It exposes **4 REST endpoints**:
- POST /api/jobs
- GET /api/jobs
- GET /api/jobs/{id}
- GET /api/jobs/{id}/export

---

# 1. POST /api/jobs
Creates a batch job from an uploaded CSV.

### Responsibilities
- Validate CSV
- Parse URLs / identifiers
- Insert job into `enrichment_jobs`
- Insert all rows into `job_practices`
- Trigger the LD5 Dispatcher workflow (n8n)
- Return `{ job_id, total_practices }`

---

# 2. GET /api/jobs
Returns all jobs for the authenticated user.

Supports:
- RLS-based isolation
- Sorting by `created_at`

---

# 3. GET /api/jobs/{id}
Returns:
- Job metadata
- All practice rows
- Current progress counters

Used for polling.

---

# 4. GET /api/jobs/{id}/export
Generates a CSV that contains:
- Practice identifiers
- Status
- Error messages
- Timestamps
- Flattened `final_payload` fields

---

# Supabase Integration
Backend uses:
- `supabase.auth.getUser()` for user resolution
- Row Level Security for scoping jobs/practices
- SQL triggers for job rollup counters
- JSONB storage for worker payloads

---

# n8n Integration
Backend triggers:
```
POST ${N8N_DISPATCHER_WEBHOOK}
{
  "job_id": "...",
  "practice_count": ...
}
```

Workers call:
```
supabase.from('job_practices')
  .update({ status, payloads, error_message })
  .eq('id', practice_id)
```

Triggers automatically update:
- job status
- completed count
- updated_at timestamp

