# LeadDesk 5 – n8n Workflow Architecture

## Overview
LD5 uses three worker workflows + one dispatcher.

---

# 1. Dispatcher Workflow
### Responsibilities:
- Receive `{ job_id, practice_count }` from POST /api/jobs
- Chunk practices into batches (e.g., 10–25)
- Trigger URL Worker for each batch
- Set job to "processing"

---

# 2. URL Worker
Input:
```
{ practice_id, practice_identifier }
```
Output:
- Normalized URL
- Domain resolution
- Basic validation

Writes to:
```
job_practices.url_worker_payload
job_practices.status = 'url_complete'
```

---

# 3. Scraper Worker
Input:
- Clean URL from URL Worker

Uses:
- OpenAI Responses API

Writes:
```
job_practices.scraper_worker_payload
job_practices.status = 'scraped'
```

---

# 4. Aggregator Worker
Combines:
- URL payload
- Scraper payload

Produces:
```
job_practices.final_payload
job_practices.status = 'aggregated'
```

If any failure → `status = 'error'`

---

## Error Logging
Any worker failure should:
- Write to `failed_jobs`
- Mark practice as `error`
- Allow job-level trigger to adjust job status

