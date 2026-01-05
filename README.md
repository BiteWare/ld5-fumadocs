# LeadDesk 5 Documentation

BiteWare internal documentation for LeadDesk 5 (LD5) - the production enrichment pipeline for dental practice data.

**Live Docs:** [ld5-docs.vercel.app](https://ld5-docs.vercel.app)

## Overview

LeadDesk 5 is a dental practice data enrichment platform that processes CSV uploads through an automated pipeline: URL validation, web scraping, AI-powered data extraction, and result aggregation.

**Key Improvement over LD4:** Practice-level tracking enables selective retry of failed practices without re-processing successful ones. See [LD4 to LD5 Evolution](https://ld5-docs.vercel.app/docs/architecture/evolution) for details.

## Architecture

```
Frontend (Next.js)  →  Supabase (Postgres)  →  n8n (Workflows)
     │                      │                       │
     │                      │                       ├── Dispatcher
     │                      │                       ├── URL Worker
     │                      │                       ├── Scraper Worker
     │                      │                       └── Aggregator
     │                      │
     └── API Routes ────────┴── Triggers auto-update job status
```

**Core Stack:**
- **Frontend:** Next.js App Router - CSV upload, job tracking, export
- **Backend:** Supabase - Postgres, Auth, RLS, database triggers
- **Workflows:** n8n - Dispatcher orchestrates 3 worker workflows
- **AI:** OpenAI API - Structured data extraction from practice websites

## Documentation Structure

| Section | Purpose |
|---------|---------|
| [Quickstart](https://ld5-docs.vercel.app/docs/quickstart) | End-user guide for uploading and exporting |
| [Architecture](https://ld5-docs.vercel.app/docs/architecture/system-overview) | System design, data flow diagrams |
| [Debugging Runbook](https://ld5-docs.vercel.app/docs/debugging-runbook) | Troubleshooting common failures |
| [API Reference](https://ld5-docs.vercel.app/docs/api-reference/introduction) | REST endpoint documentation |
| [Workflows](https://ld5-docs.vercel.app/docs/workflows/overview) | n8n workflow configuration |

### Key Pages for New Developers

1. **[LD4 to LD5 Evolution](https://ld5-docs.vercel.app/docs/architecture/evolution)** - Why we built it this way
2. **[System Architecture](https://ld5-docs.vercel.app/docs/architecture/system-overview)** - Component overview with diagrams
3. **[Database Schema](https://ld5-docs.vercel.app/docs/architecture/database-schema)** - Tables, triggers, relationships
4. **[Error Handling](https://ld5-docs.vercel.app/docs/architecture/error-handling)** - How errors propagate
5. **[Debugging Runbook](https://ld5-docs.vercel.app/docs/debugging-runbook)** - Fix common issues

## Local Development

This documentation site is built with [Fumadocs](https://fumadocs.vercel.app/).

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

View at `http://localhost:3000`

## Status Values Reference

### Job Status (`enrichment_jobs.status`)
| Status | Meaning |
|--------|---------|
| `pending` | Job created, no practices started |
| `running` | At least one practice in progress |
| `completed` | All practices finished successfully |
| `error` | Job has failures (may still have successful practices) |

### Practice Status (`job_practices.status`)
| Status | Meaning |
|--------|---------|
| `pending` | Queued, not started |
| `url_complete` | URL worker finished |
| `scraped` | Scraper worker finished |
| `aggregated` | Aggregator finished (terminal success) |
| `error` | Failed at any stage (terminal failure) |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (frontend) |
| `SUPABASE_URL` | Supabase project URL (backend/n8n) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (n8n workers) |
| `LD5_DISPATCHER_WEBHOOK_URL` | n8n dispatcher trigger URL |
| `OPENAI_API_KEY` | OpenAI API key (scraper worker) |

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/jobs` | Create job from CSV upload |
| `GET /api/jobs` | List user's jobs |
| `GET /api/jobs/{id}` | Get job with all practices |
| `GET /api/jobs/{id}/export` | Download CSV results |
| `GET /api/jobs/{id}/export-excel` | Download Excel results |
| `GET /api/jobs/{id}/export-json` | Download JSON results |
| `POST /api/redo-job` | Retry failed practices |
| `POST /api/kill-job` | Cancel running job |
| `GET /api/check-job-status` | Lightweight status check |

## Support

Contact: support@zyris.com
