// Standalone local server for the packaged "Local Edition":
// serves the built frontend (../app) AND the fake-Supabase API on one port.
// Data lives in the browser's IndexedDB (origin 127.0.0.1:8100); the
// in-memory server tables reseed on every start. No sync with the online
// site or the Android app.
import { handleRequest, SEED } from "./handler.mjs";

const PORT = 8100;
const APP_DIR = new URL("../app/", import.meta.url);

function nextId(rows) {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function buildSeedTables() {
  const semesterId = 1;
  const courses = SEED.courses.map((c, i) => ({ id: i + 1, ...c, semester_id: semesterId }));
  const tasks = SEED.tasks.map((t, i) => ({ id: i + 1, ...t, campaign_id: null, created_at: new Date().toISOString() }));
  return {
    semesters: [{ id: semesterId, ...SEED.semester, created_at: new Date().toISOString() }],
    period_slots: SEED.periods.map((p, i) => ({ id: i + 1, ...p })),
    holidays: SEED.holidays.map((h, i) => ({ id: i + 1, ...h })),
    courses,
    campaigns: [],
    tasks,
    task_completions: [],
    countdowns: [],
    homework: [],
    day_overrides: [],
    settings: [{ id: 1, ...SEED.settings }],
  };
}

class FakeBuilder {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this._mode = "select";
    this._payload = null;
    this._cols = "*";
    this._filters = [];
    this._single = false;
    this._order = null;
    this._limit = null;
  }
  select(cols = "*") { this._cols = cols; return this; }
  insert(row) { this._mode = "insert"; this._payload = row; return this; }
  update(row) { this._mode = "update"; this._payload = row; return this; }
  upsert(row) { this._mode = "upsert"; this._payload = row; return this; }
  delete() { this._mode = "delete"; return this; }
  eq(col, val) { this._filters.push(r => r[col] === val); return this; }
  neq(col, val) { this._filters.push(r => r[col] !== val); return this; }
  not(col, op, val) {
    if (op === "is") this._filters.push(r => r[col] !== val);
    else if (op === "eq") this._filters.push(r => r[col] !== val);
    else throw new Error(`fake_supabase: unsupported not operator ${op}`);
    return this;
  }
  in(col, arr) { this._filters.push(r => arr.includes(r[col])); return this; }
  is(col, val) { this._filters.push(r => r[col] === val); return this; }
  gte(col, val) { this._filters.push(r => r[col] >= val); return this; }
  lte(col, val) { this._filters.push(r => r[col] <= val); return this; }
  order(col, opts) { this._order = { col, asc: opts?.ascending ?? true }; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; this._maybe = true; return this; }

  _match(rows) { return rows.filter(r => this._filters.every(f => f(r))); }
  _project(rows) {
    if (!this._cols || this._cols === "*") return rows;
    const cols = this._cols.split(",").map(c => c.trim());
    return rows.map(r => {
      const o = {};
      for (const c of cols) if (c in r) o[c] = r[c];
      return o;
    });
  }
  _run() {
    const db = this.db;
    const rows = db[this.table] || [];
    if (this._mode === "insert") {
      const newRow = { id: nextId(rows), ...this._payload };
      rows.push(newRow);
      db[this.table] = rows;
      if (this._single) return { data: this._project([newRow])[0], error: null };
      return { data: null, error: null };
    }
    if (this._mode === "upsert") {
      const existing = rows.find(r => r.id === this._payload.id);
      if (existing) Object.assign(existing, this._payload);
      else rows.push({ ...this._payload });
      db[this.table] = rows;
      if (this._single) return { data: this._project([this._payload])[0], error: null };
      return { data: null, error: null };
    }
    if (this._mode === "update") {
      const targets = this._match(rows);
      for (const r of targets) Object.assign(r, this._payload);
      db[this.table] = rows;
      if (this._single) {
        if (targets.length === 0) return { data: null, error: { code: "PGRST116", message: "no rows" } };
        return { data: this._project(targets)[0], error: null };
      }
      return { data: this._project(targets), error: null };
    }
    // delete
    const removed = this._match(rows);
    db[this.table] = rows.filter(r => !removed.includes(r));
    if (this._single) return { data: removed.length ? this._project([removed])[0] : null, error: removed.length ? null : { message: "no rows" } };
    return { data: this._project(removed), error: null };
  }
  _select() {
    let rows = this._match(this.db[this.table] || []);
    if (this._order) {
      const { col, asc } = this._order;
      rows = [...rows].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this._limit != null) rows = rows.slice(0, this._limit);
    const projected = this._project(rows);
    if (this._single) {
      if (projected.length === 0) return { data: null, error: { code: "PGRST116", message: "no rows" } };
      return { data: projected[0], error: null };
    }
    return { data: projected, error: null };
  }
  then(res, rej) {
    try {
      const out = this._mode === "select" ? this._select() : this._run();
      return Promise.resolve(out).then(res, rej);
    } catch (e) {
      return Promise.reject(e).catch(rej, e);
    }
  }
}

const db = buildSeedTables();
const fakeSupabase = { from(table) { return new FakeBuilder(db, table); } };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

async function serveFile(rel) {
  const url = new URL(rel, APP_DIR);
  if (!url.pathname.startsWith(APP_DIR.pathname)) return null;
  try {
    const data = await Deno.readFile(url);
    const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
    return new Response(data, {
      headers: { "content-type": MIME[ext] || "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

async function serveStatic(pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (rel === "") rel = "index.html";
  const res = await serveFile(rel);
  if (res) return res;
  // SPA fallback
  return await serveFile("index.html") ?? new Response("Not Found", { status: 404 });
}

Deno.serve({ port: PORT }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/functions/v1/app")) {
    return await handleRequest({ request, supabase: fakeSupabase });
  }
  return await serveStatic(url.pathname);
});

console.log(`My Schedule Local Edition on http://127.0.0.1:${PORT}/`);
