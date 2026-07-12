# CSV import (users + courses)

Local CSV import stub for seeding users and courses from spreadsheet exports. Google Sheets API integration is optional and not required for MVP.

## Prerequisites

- PostgreSQL running with migrations applied
- `DATABASE_URL` set (see `web/.env.example`)

## CSV files

Place or edit files under `web/scripts/data/`:

| File | Columns |
|------|---------|
| `users.csv` | `username`, `password`, `displayName` |
| `courses.csv` | `className`, `levelName`, `name`, `active` |

Templates ship with header rows only. Fill in rows before importing. Do **not** commit real production passwords.

- **Users:** passwords are bcrypt-hashed on import; upsert is by `username`.
- **Courses:** upsert matches existing rows by `name` + `className` + `levelName`, otherwise creates a new course. `active` accepts `true`/`false`, `1`/`0`, or `yes`/`no` (defaults to `true` if empty).

## Run

From `web/`:

```bash
npx tsx scripts/import-from-sheets.ts
```

Example output:

```
Import complete
  users: 2 created, 0 updated, 0 skipped
  courses: 1 created, 1 updated, 0 skipped
```

## Google Sheets (optional, later)

This script reads local CSV files only. To pull directly from Google Sheets in the future, set:

```
GOOGLE_SERVICE_ACCOUNT_JSON=<service account JSON string>
```

Do not commit service account credentials to the repository. Export sheets to CSV and import locally until Sheets API support is added.
