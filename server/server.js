const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "sendlog.db");

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Open (or create) the SQLite database
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT
  )
`);

// GET /kv/:key — read a value
app.get("/kv/:key", (req, res) => {
  const row = db.prepare("SELECT value FROM kv_store WHERE key = ?").get(req.params.key);
  if (!row) return res.json(null);
  res.json({ value: row.value });
});

// POST /kv/:key — write a value (body is the JSON value)
app.post("/kv/:key", (req, res) => {
  const value = JSON.stringify(req.body);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
  ).run(req.params.key, value, now);
  res.json({ ok: true });
});

// DELETE /kv/:key — delete a value
app.delete("/kv/:key", (req, res) => {
  db.prepare("DELETE FROM kv_store WHERE key = ?").run(req.params.key);
  res.json({ ok: true });
});

// Health check
app.get("/health", (req, res) => res.json({ ok: true, db: DB_PATH }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SendLog KV server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
