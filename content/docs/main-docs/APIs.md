# LeadDesk 5 – API Documentation

## Summary
LD5 exposes 4 REST endpoints to manage batch processing and exports.

---

# POST /api/jobs
Upload CSV → create job.

### Response
```json
{ "job_id": "uuid", "total_practices": 94 }
```

---

# GET /api/jobs
Return authenticated user jobs.

---

# GET /api/jobs/{id}
Return:
- job metadata
- practices array

Used for frontend polling.

---

# GET /api/jobs/{id}/export
Returns a CSV with:
- practice_identifier
- status
- error_message
- timestamps
- flattened aggregated data

---

## Auth
All endpoints require:
```
Authorization: Bearer <supabase-token>
```

---

## Example curl
```bash
curl -X POST http://localhost:3000/api/jobs   -H "Authorization: Bearer TOKEN"   -F "file=@practices.csv"
```

