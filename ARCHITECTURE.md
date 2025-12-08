# LeadDeskBatch Application Architecture

## Overview

LeadDeskBatch (LD5) is a Next.js 15 application for batch processing dental practice enrichment. It enables CSV upload of practice URLs, processes them through an external n8n workflow pipeline, and provides multi-format export capabilities (CSV, Excel, JSON).

---

## Project Structure

```
LeadDeskBatch/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes
│   │   ├── jobs/                  # Job CRUD endpoints
│   │   │   ├── route.ts           # POST: Upload CSV, GET: List jobs
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET: Job detail with practices
│   │   │       ├── export/        # GET: Export as CSV
│   │   │       ├── export-excel/  # GET: Export as Excel
│   │   │       └── export-json/   # GET: Export as raw JSON
│   │   ├── check-job-status/      # POST: Check job status
│   │   ├── kill-job/              # POST: Cancel/delete job
│   │   ├── redo-job/              # POST: Retry failed practices
│   │   ├── search-practices/      # POST: Search and submit practices
│   │   ├── get-job-users/         # GET: Fetch user emails
│   │   ├── save-excluded-job/     # POST: Save excluded practices
│   │   └── submit-leaddesk/       # POST: Submit enrichment job
│   ├── auth/                      # Authentication
│   │   └── page.tsx               # Login page
│   ├── jobs/                      # Job management pages
│   │   ├── page.tsx               # Jobs list page
│   │   ├── new/page.tsx           # New job upload page
│   │   └── [id]/page.tsx          # Job detail page
│   ├── results/                   # Results display pages
│   │   ├── page.tsx               # Results list page
│   │   └── [id]/page.tsx          # Individual result page
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home (redirects to /jobs/new)
├── components/
│   ├── ui/                        # Shadcn UI components (40+ files)
│   ├── app-sidebar-custom.tsx     # Custom sidebar navigation
│   ├── auth-guard.tsx             # Authentication guard
│   ├── batch-jobs-table.tsx       # Jobs list table
│   ├── csv-uploader.tsx           # CSV file upload component
│   ├── export-csv-button.tsx      # Export dropdown (CSV/Excel/JSON)
│   ├── job-header.tsx             # Job metadata header
│   ├── practice-table.tsx         # Practices in job table
│   └── ...                        # Other components
├── hooks/
│   ├── use-job-polling.ts         # Auto-refresh job data
│   ├── use-toast.ts               # Toast notifications
│   ├── useJobData.ts              # Fetch job from database
│   └── useUsers.ts                # User auth operations
├── lib/
│   ├── LD-API-Client.ts           # API client functions
│   └── utils.ts                   # Utility functions
├── types/
│   ├── database.types.ts          # Supabase database types
│   └── job.types.ts               # Job-specific types
├── utils/
│   ├── supabase.ts                # Supabase client setup
│   ├── scraper-transformer.ts     # Transform scraper output
│   ├── cohort-classifier.ts       # Classify practices
│   └── master-exclusion-checker.ts # Exclusion logic
├── migrations/
│   └── 001_create_batch_tables.sql # Database schema
└── package.json                   # Dependencies
```

---

## Database Schema

### Tables (Supabase PostgreSQL)

#### `enrichment_jobs` - Main job records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| original_filename | TEXT | Uploaded CSV filename |
| total_practices | INT | Total practice count |
| completed_practices | INT | Completed practice count |
| status | TEXT | pending, running, completed, error |
| error_message | TEXT | Job-level error message |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `job_practices` - Individual practice records
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| job_id | UUID | Foreign key to enrichment_jobs |
| practice_identifier | TEXT | Practice URL or identifier |
| status | TEXT | pending, url_complete, scraped, aggregated, error |
| url_worker_payload | JSONB | URL worker response |
| scraper_worker_payload | JSONB | Scraper worker response |
| final_payload | JSONB | Final aggregated data |
| error_message | TEXT | Practice-level error |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `failed_jobs` - Error tracking
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| failed_workflow_id | TEXT | n8n workflow ID |
| failed_workflow_name | TEXT | Workflow name |
| error_message | TEXT | Error details |
| original_input_data | JSONB | Original request data |
| logged_at | TIMESTAMPTZ | Error timestamp |

### Row Level Security (RLS)
- Users can only view/modify their own jobs and practices
- Policies enforce `user_id = auth.uid()` checks

### Database Triggers
- `update_enrichment_job_updated_at()` - Auto-update job timestamp
- `update_completed_practices_counter()` - Track completed practices
- `update_job_status()` - Auto-update job status based on completion

---

## API Routes

### Job Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Upload CSV, create batch job |
| GET | `/api/jobs` | List all user's jobs |
| GET | `/api/jobs/[id]` | Get job detail with practices |
| GET | `/api/jobs/[id]/export` | Export as CSV |
| GET | `/api/jobs/[id]/export-excel` | Export as Excel (.xlsx) |
| GET | `/api/jobs/[id]/export-json` | Export as raw JSON |

### Job Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kill-job` | Cancel or delete job |
| POST | `/api/redo-job` | Retry failed practices |
| POST | `/api/check-job-status` | Get job status snapshot |

### Practice Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search-practices` | Search and submit practice |
| POST | `/api/save-excluded-job` | Save excluded practice |
| POST | `/api/submit-leaddesk` | Submit to external dispatcher |

---

## Data Flow

```
1. USER UPLOAD
   └─> CSV file selected
       └─> Client-side parse (PapaParse)
           └─> Preview & validation

2. JOB CREATION
   └─> POST /api/jobs
       ├─> Create enrichment_jobs record
       ├─> Create job_practices records (status='pending')
       └─> Trigger LD5_DISPATCHER_WEBHOOK_URL

3. EXTERNAL PROCESSING (n8n)
   └─> URL Worker: Find practice website
       └─> Scraper Worker: Extract practice data
           └─> Aggregator: Compile final results
               └─> Update job_practices.final_payload

4. MONITORING
   └─> /jobs/[id] page
       └─> useJobPolling (3-second intervals)
           └─> Display progress & status

5. EXPORT
   └─> User clicks Export dropdown
       └─> GET /api/jobs/[id]/export[-excel|-json]
           └─> extractPracticeData() merges validation + enrichment
               └─> Map to CSV columns
                   └─> Download file
```

---

## Export Data Extraction

The `extractPracticeData()` function merges data from two sources in `final_payload`:

### Data Sources
- **VALIDATION** (`result[]` array): URL/address validation results
- **ENRICHMENT** (numbered keys): Detailed practice data from scraper

### Field Priority

| Field | Source Priority |
|-------|-----------------|
| Practice URL | validation.homepage_url → validation.website_url → enrichment.resulting_url |
| Address | validation.corrected_address → validation.validated_address → enrichment.address |
| Practice Name | validation → enrichment |
| Phone | enrichment → validation |
| Email | enrichment only |
| Specialties | enrichment only |
| Staff/Person In Charge | enrichment only |
| Scrape Notes | validation note + enrichment notes (concatenated) |

### CSV/Excel Column Mappings (20 columns)

| Column | Source |
|--------|--------|
| Company Name | practice_name |
| Shipping Address | locations[0].address.street |
| Shipping City | locations[0].address.city |
| Shipping State | locations[0].address.state |
| Shipping Zip | locations[0].address.zip |
| Phone Number | phone |
| Practice URL | resulting_url |
| Practice Email | email |
| Primary Specialty | practice_specialties[0] |
| All Specialties | practice_specialties.join('; ') |
| Person In Charge | person_in_charge.name (role) |
| Person In Charge Credentials | person_in_charge.credentials |
| Dentist Count | Count staff with DDS/DMD/Dentist in role |
| Hygienist Count | Count staff with RDH/Hygienist in role |
| Total Staff | staff_list.length |
| Location Count | locations.length |
| Works Multiple Locations | works_multiple_locations |
| Staff Directory | staff_list formatted as "name - role" |
| All Locations | locations formatted with address/phone |
| Scrape Notes | validation + enrichment notes |

---

## Authentication

### Provider
Supabase (PostgreSQL + JWT)

### Flow
1. User navigates to `/auth`
2. Enters credentials in `<LoginForm />`
3. `supabase.auth.signInWithPassword()` returns JWT
4. JWT stored in cookies (managed by Supabase)
5. API routes verify via `createRouteHandlerClient(request)`
6. RLS policies enforce data isolation

### Key Functions
- `createRouteHandlerClient(request)` - Server-side auth for API routes
- `getSupabaseClient()` - Client-side auth for browser
- `supabase.auth.getUser()` - Get current authenticated user

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `<CsvUploader />` | Drag-drop CSV upload with preview |
| `<BatchJobsTable />` | List jobs with search, status, actions |
| `<PracticeTable />` | Display practices with status & errors |
| `<JobHeader />` | Job metadata, progress bar, stats |
| `<ExportCsvButton />` | Dropdown for CSV/Excel/JSON export |
| `<AppSidebarCustom />` | Navigation sidebar |
| `<LoginForm />` | Email/password login |

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useJobPolling(jobId, interval)` | Auto-refresh job data until complete |
| `useJobData(correlationId)` | Fetch practice job with polling |
| `useUsers()` | Sign in, sign out, auth state |
| `useToast()` | Toast notifications |

---

## Dependencies

### Core
- `next` (15.2.4) - React framework
- `react` (^19) - UI library
- `typescript` (^5) - Type safety

### UI
- `tailwindcss` (^3.4.17) - Utility CSS
- `@radix-ui/*` - Headless UI components
- `lucide-react` - Icons

### Data
- `papaparse` (^5.5.3) - CSV parsing
- `xlsx` (^0.18.5) - Excel export
- `@supabase/supabase-js` (^2.50.0) - Database client

### Forms
- `react-hook-form` (^7.54.1) - Form management
- `zod` (^3.24.1) - Schema validation

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# External Webhooks
LD5_DISPATCHER_WEBHOOK_URL=https://...  # Batch job dispatcher
LEADDESK_DISPATCHER_WEBHOOK_URL=https://...  # Single practice dispatcher
```

---

## Practice Status Flow

```
pending → url_complete → scraped → aggregated (SUCCESS)
   ↓          ↓            ↓           
   └──────────┴────────────┴──────────→ error (FAILURE)
```

## Job Status Flow

```
pending → running → completed
            ↓
          error
```

---

## Key Features

1. **CSV Batch Processing** - Upload CSV, automatic job creation
2. **Real-time Monitoring** - Auto-polling with progress display
3. **Multi-Format Export** - CSV, Excel (.xlsx), Raw JSON
4. **Practice Enrichment** - Multi-stage pipeline (URL → Scrape → Aggregate)
5. **Data Merging** - Combines validation and enrichment results
6. **Error Recovery** - Retry failed practices, cancel jobs
7. **Exclusion System** - DSO, education, government filtering
8. **Row Level Security** - User data isolation

---

## Last Updated
December 4, 2025
