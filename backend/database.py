import sqlite3
import string
import secrets

DB_PATH = "urls.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            short_code TEXT UNIQUE NOT NULL,
            original_url TEXT NOT NULL,
            clicks INTEGER DEFAULT 0,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_short_code ON links(short_code);
    """)
    conn.commit()
    try:
        conn.execute("ALTER TABLE links ADD COLUMN title TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    conn.close()


def generate_short_code(length: int = 6) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_link(original_url: str, custom_slug: str | None = None) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if custom_slug:
        cur.execute("SELECT id FROM links WHERE short_code = ?", (custom_slug,))
        if cur.fetchone() is not None:
            conn.close()
            raise ValueError("Custom slug already exists")

    short_code = custom_slug or generate_short_code()
    while not custom_slug:
        cur.execute("SELECT id FROM links WHERE short_code = ?", (short_code,))
        if cur.fetchone() is None:
            break
        short_code = generate_short_code()

    cur.execute(
        "INSERT INTO links (short_code, original_url, title) VALUES (?, ?, ?)",
        (short_code, original_url, None),
    )
    conn.commit()
    row = cur.execute("SELECT * FROM links WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def get_link(short_code: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "UPDATE links SET clicks = clicks + 1 WHERE short_code = ?",
        (short_code,),
    )
    conn.commit()
    row = cur.execute("SELECT * FROM links WHERE short_code = ?", (short_code,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_links() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM links ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_link_title(short_code: str, title: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE links SET title = ? WHERE short_code = ?", (title, short_code))
    conn.commit()
    conn.close()


def delete_link(short_code: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM links WHERE short_code = ?", (short_code,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
