import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Link2, Copy, Trash2, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [shortUrl, setShortUrl] = useState(null);
  const [shortUrlPreview, setShortUrlPreview] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchLinks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/links`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleShorten = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setShortUrl(null);
    setShortUrlPreview(null);
    try {
      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmed,
          custom_slug: customSlug.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.detail || 'Failed to shorten');
        return;
      }
      const full = `${API_BASE}${data.short_url}`;
      setShortUrl(full);
      setShortUrlPreview({ title: data.title, favicon: data.favicon });
      fetchLinks();
      showToast('Link created');
    } catch {
      showToast('Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyShortUrl = (text) => {
    navigator.clipboard.writeText(text).then(
      () => showToast('Copied'),
      () => showToast('Copy failed'),
    );
  };

  const handleDelete = async (shortCode) => {
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_BASE}/api/links/${shortCode}`, { method: 'DELETE' });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.short_code !== shortCode));
        if (shortUrl?.endsWith(`/r/${shortCode}`)) {
          setShortUrl(null);
          setShortUrlPreview(null);
        }
        showToast('Deleted');
      }
    } catch {
      showToast('Delete failed');
    }
  };

  const fullShortUrl = (shortCode) => `${API_BASE}/r/${shortCode}`;

  return (
    <div
      className="min-h-screen"
      data-theme={dark ? 'dark' : 'light'}
      style={{ color: 'var(--text)' }}
    >
      <div className="page-bg" />
      <header className="border-b sticky top-0 z-40 backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Link Snipper</h1>
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            aria-label={dark ? 'Switch to light' : 'Switch to dark'}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <section className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
            Shorten any URL in seconds
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Paste your long link, add an optional custom slug, and get a short shareable URL.
          </p>
        </section>

        <form onSubmit={handleShorten} className="space-y-4 mb-10 p-6 sm:p-8 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Paste long URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--bg)] focus:ring-[var(--accent)] transition-all"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
            <input
              type="text"
              placeholder="Custom slug (optional)"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              className="sm:w-40 px-4 py-3 rounded-lg border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--bg)] focus:ring-[var(--accent)] transition-all"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
            <motion.button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              <Link2 size={18} strokeWidth={2.5} />
              {loading ? '...' : 'Shorten'}
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {shortUrl && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-10 p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {shortUrlPreview?.favicon && (
                  <img
                    src={shortUrlPreview.favicon}
                    alt=""
                    className="w-8 h-8 rounded shrink-0"
                  />
                )}
                <div className="min-w-0">
                  {shortUrlPreview?.title && (
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {shortUrlPreview.title}
                    </p>
                  )}
                  <code className="font-mono text-sm truncate block" style={{ color: 'var(--accent)' }}>
                    {shortUrl}
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyShortUrl(shortUrl)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Copy size={16} />
                Copy
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <section>
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            Recent links
          </h2>
          {links.length === 0 ? (
            <div className="py-16 px-6 rounded-xl border border-dashed text-center" style={{ borderColor: 'var(--border)' }}>
              <Zap size={40} className="mx-auto mb-4 opacity-40" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No links yet</p>
              <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
                Paste a URL above and hit Shorten to create your first link.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence mode="popLayout">
                {links.map((link) => (
                  <motion.li
                    key={link.short_code}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {link.favicon && (
                        <img src={link.favicon} alt="" className="w-6 h-6 rounded shrink-0" />
                      )}
                      <div className="min-w-0">
                        {link.title && (
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                            {link.title}
                          </p>
                        )}
                        <a
                          href={fullShortUrl(link.short_code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm truncate block hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          /r/{link.short_code}
                        </a>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {link.original_url}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {link.clicks} clicks
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyShortUrl(fullShortUrl(link.short_code))}
                        className="p-2 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                        title="Copy"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(link)}
                        className="p-2 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: 'var(--danger)', color: 'white' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </main>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="rounded-xl border p-6 max-w-sm w-full"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                Delete link?
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                This will remove /r/{deleteTarget.short_code}. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteTarget.short_code)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--danger)', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
