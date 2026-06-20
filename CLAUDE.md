# SnapTag — Field Inspection App

## What this app is

SnapTag is a mobile-first field inspection tool. Inspectors create **sites**, assign **checklist templates** to them, then capture evidence (photos, videos, text notes, measurements) and complete structured checklists. All data syncs to a local MySQL database; media can optionally be uploaded to S3.

---

## Running the project

```bash
# Start Python API server (port 3001)
bash start.sh

# Start Expo dev server
cd snaptag
npx expo start --clear
```

For mobile (Expo Go): scan QR code. For web: press `w`.

**Always restart the Python server after changing `database.py`** — `init_db()` runs migrations on startup.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React Native 0.85.3, Expo SDK 56, Expo Go |
| Navigation | React Navigation (stack) |
| Backend | Python FastAPI, port 3001 |
| Database | MySQL (`snaptag` database) |
| Auth | JWT tokens, bcrypt passwords, AsyncStorage |
| File storage | `expo-file-system` (local), AWS S3 (optional upload) |
| Media | `expo-camera`, `expo-video`, `expo-location` |

---

## Environment variables (`.env`)

```
EXPO_PUBLIC_API_URL=http://192.168.68.108:3001      # Mobile (LAN IP of server machine)
EXPO_PUBLIC_API_URL_WEB=http://localhost:3001        # Web browser
EXPO_PUBLIC_AWS_ACCESS_KEY_ID=...
EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=...
EXPO_PUBLIC_AWS_REGION=ap-southeast-1
EXPO_PUBLIC_S3_BUCKET=alix-aiml
EXPO_PUBLIC_S3_REGION=ap-southeast-1
```

**Platform URL selection** (`apiService.js`, `authService.js`):
```js
const BASE = Platform.OS === 'web'
  ? process.env.EXPO_PUBLIC_API_URL_WEB
  : process.env.EXPO_PUBLIC_API_URL;
```

Env vars bake into the bundle at build time — change IP → restart Expo with `--clear`.

---

## Project structure

```
snaptag/
├── src/
│   ├── screens/          # One file per screen
│   ├── services/         # API + storage logic
│   ├── components/       # Reusable UI components
│   ├── constants/        # theme.js, checklists.js, tags.js
│   ├── contexts/         # AuthContext (JWT session)
│   └── navigation/       # AppNavigator.jsx (stack routes)
├── server_py/
│   ├── main.py           # FastAPI app, CORS, lifespan
│   ├── database.py       # MySQL pool + init_db() migrations
│   ├── deps.py           # JWT auth dependency
│   └── routers/
│       ├── auth.py       # POST /auth/register, /auth/login
│       ├── files.py      # CRUD /files + /trash + restore + permanent-delete
│       ├── captures.py   # CRUD /captures
│       └── checklists.py # /checklists per file
└── .env
```

---

## Screens and navigation flow

```
HomeScreen
  → SiteSetupScreen       (new site → pick checklist templates)
  → InspectionHubScreen   (main entry point for a site)
      → CameraScreen      (photo/video)
          → TagScreen     (tag + notes + link to checklist item → save)
      → TextNoteScreen
      → MeasurementEntryScreen
      → ChecklistFormScreen (complete a checklist)
  → TrashScreen           (recycle bin — restore or permanently delete)
LibraryScreen             (view all captures per site)
```

---

## Database schema (4 tables)

### `users`
`id`, `email`, `password` (bcrypt), `name`, `role`

### `files` (sites)
`id`, `user_id`, `name`, `slug`, `checklist_template_ids` (JSON), `capture_count`, `created_at`, `updated_at`, `deleted_at` (NULL = active, set = in recycle bin)

### `captures`
`id`, `file_id`, `user_id`, `filename`, `media_type` (`photo`/`video`/`text`/`measurement`/`checklist`), `tag`, `notes`, `content` (text body / checklist JSON / measurement value), `unit`, `gps_lat`, `gps_lng`, `gps_alt`, `s3_data_key`, `s3_metadata_key`, `file_slug`, `file_name`, `upload_status`, `local_uri`, `captured_at`, `uploaded_at`, `device_id`

### `checklists`
`file_id`, `user_id`, `template_ids` (JSON), `custom_items` (JSON), `progress_data` (JSON — per-item check state, notes, linked capture IDs), `completed_at`

---

## Key patterns

### Soft delete (recycle bin)
`DELETE /files/:id` sets `deleted_at = NOW()` (not a hard delete).
`GET /files` excludes `deleted_at IS NOT NULL`.
`POST /files/:id/restore` → clears `deleted_at`.
`DELETE /files/:id/permanent` → hard deletes only if `deleted_at IS NOT NULL`.

### Media save flow
1. Camera captures temp URI
2. `copyToPermanentStorage()` copies to `FileSystem.documentDirectory/captures/`
3. `saveCapture()` POSTs metadata to MySQL (`local_uri` = permanent device path)
4. "Save & Upload" also pushes file bytes to S3

### Web: strip base64 from `local_uri`
Web camera returns base64 data URLs (can be MBs). Never store in DB — `storageService.js` strips any `localUri` starting with `data:` before sending to API.

### Checklist captures
Completed checklists saved as `media_type = 'checklist'` capture. `content` is JSON:
```json
{
  "template": { "id": "plumbing", "name": "Plumbing" },
  "items": [{ "id": "pl_1", "label": "Water Pressure Check", "checked": true, "note": "", "action": "" }],
  "summary": { "checked": 2, "total": 4, "pct": 50 }
}
```

### Reload on focus
All data screens use `useFocusEffect` + `useCallback` to reload from DB on every navigation focus.

### AbortController / fetch cancellation
React Native throws `Error` (not `AbortError`) with message `'Fetch request has been canceled'`.
Check both: `err.name === 'AbortError' || err.message === 'Fetch request has been canceled'`.

---

## Checklist templates (hardcoded in `src/constants/checklists.js`)

| ID | Name | Items |
|---|---|---|
| `retraining` | Retraining | 4 |
| `electrical` | Electrical | 4 |
| `plumbing` | Plumbing | 4 |
| `structural` | Structural | 5 |
| `safety` | Safety | 4 |

Template IDs are stored in `files.checklist_template_ids` (JSON array) so assigned checklists survive app reloads.

---

## Adding a new screen

1. Create `src/screens/NewScreen.jsx`
2. Import and add `<Stack.Screen name="New" component={NewScreen} />` in `AppNavigator.jsx`
3. Navigate with `navigation.navigate('New', { params })`

## Adding a new API endpoint

1. Add route function to relevant router in `server_py/routers/`
2. Add corresponding function in `src/services/` calling `api()` from `apiService.js`

## Adding a DB column

Add a migration block in `database.py` `init_db()` using the existing pattern:
```python
cur.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='tablename' AND COLUMN_NAME='newcol'", (db_name,))
if cur.fetchone()[0] == 0:
    cur.execute("ALTER TABLE tablename ADD COLUMN newcol VARCHAR(100)")
```
Then restart the server.
