# LeadDesk 5 Documentation

BiteWare Internal Documentation for LeadDesk 5 (LD5) - the production enrichment pipeline for dental practice data.

## Overview

LeadDesk 5 replaces all legacy LD3/LD4 systems with a practice-level tracking architecture.

**Core Stack:**
- **Supabase** - Database, Auth, RLS
- **n8n** - Dispatcher → Workers → Aggregator workflows
- **Next.js** - Authenticated API layer
- **Frontend** - CSV upload, job tracking, export

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview documentation changes locally:

```bash
npm i -g mint
```

Run the following command at the root of your documentation:

```bash
mint dev
```

View your local preview at `http://localhost:3000`.

## Key Identifiers

- `job_id` - UUID linking all practices in an upload
- `practice_identifier` - Individual practice URL/identifier

## Status Values

### Job Status (enrichment_jobs.status)
- `pending` - Job created, no practices started
- `running` - At least one practice in progress
- `completed` - All practices finished
- `error` - Job-level failure

### Practice Status (job_practices.status)
- `pending` - Queued, not started
- `url_complete` - URL worker finished
- `scraped` - Scraper worker finished
- `aggregated` - Aggregator finished (terminal)
- `error` - Failed at any stage (terminal)

## Environment Variables

| Variable | Purpose |
|----------|---------|
| LD5_DISPATCHER_WEBHOOK_URL | n8n dispatcher trigger URL |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Public key for frontend |
| SUPABASE_SERVICE_ROLE_KEY | Service key for n8n |

## Support

Contact: support@zyris.com
