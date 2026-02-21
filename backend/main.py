import re
import sqlite3
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from database import init_db, create_link, get_link, get_all_links, update_link_title, delete_link

app = FastAPI(title="URL Shortener API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ShortenRequest(BaseModel):
    url: str
    custom_slug: str | None = None


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
async def root():
    return {"message": "URL Shortener API", "docs": "/docs"}


async def _check_reachable(url: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.head(url)
            return resp.status_code < 400
    except Exception:
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                resp = await client.get(url)
                return resp.status_code < 400
        except Exception:
            return False


async def _fetch_title(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return None
            body = resp.text[:64 * 1024]
            m = re.search(r"<title[^>]*>([^<]+)</title>", body, re.I | re.DOTALL)
            return m.group(1).strip()[:200] if m else None
    except Exception:
        return None


def _favicon_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split("/")[0]
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
    except Exception:
        return ""


@app.post("/api/shorten")
async def shorten(req: ShortenRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    if not await _check_reachable(url):
        raise HTTPException(status_code=400, detail="URL is not reachable")

    try:
        link = create_link(url, req.custom_slug)
    except (sqlite3.IntegrityError, ValueError) as e:
        detail = str(e) if isinstance(e, ValueError) else "Custom slug already exists"
        raise HTTPException(status_code=400, detail=detail)

    title = await _fetch_title(url)
    if title:
        update_link_title(link["short_code"], title)

    return {
        "short_code": link["short_code"],
        "short_url": f"/r/{link['short_code']}",
        "original_url": link["original_url"],
        "title": title,
        "favicon": _favicon_url(url),
    }


@app.get("/r/{short_code}")
async def redirect(short_code: str):
    link = get_link(short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return RedirectResponse(url=link["original_url"], status_code=302)


@app.get("/api/links")
async def list_links():
    links = get_all_links()
    return [
        {
            "short_code": l["short_code"],
            "original_url": l["original_url"],
            "clicks": l["clicks"],
            "created_at": l["created_at"],
            "title": l.get("title"),
            "favicon": _favicon_url(l["original_url"]),
        }
        for l in links
    ]


@app.delete("/api/links/{short_code}")
async def remove_link(short_code: str):
    if not delete_link(short_code):
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Deleted"}
