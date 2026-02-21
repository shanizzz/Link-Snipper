# Link Snipper

A full-stack URL shortener with a FastAPI backend and React frontend. Shorten long URLs, track clicks, and manage links with a polished UI.

## Features

- Shorten any URL with optional custom slugs
- Copy short links to clipboard
- List all shortened links with click counts
- Delete links
- 4 themes: Midnight, Light, Ocean, Sunset
- No API keys required

## Tech Stack

- **Backend:** FastAPI, SQLite, Python 3.x
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide icons

## Setup

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs at [http://localhost:5173](http://localhost:5173) and proxies API requests to the backend at `http://localhost:8000`.

### Environment (optional)

Create `client/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

This is the base URL for short links (used when copying). Defaults to `http://localhost:8000` if not set.

## API

- `POST /api/shorten` – Create short link (body: `url`, optional `custom_slug`)
- `GET /r/{short_code}` – Redirect to original URL
- `GET /api/links` – List all links
- `DELETE /api/links/{short_code}` – Delete a link

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
