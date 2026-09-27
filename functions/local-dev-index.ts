// Local development entry point with an in-memory fake Supabase.
// Uses the SAME authoritative SEED as production (handler.mjs) so local
// behavior matches the deployed site. Not for production use.
import { handleRequest, SEED } from "./handler.mjs";

function nextId(rows) {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

// Build the initial tables exactly like seedIfEmpty() does.
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
    if (this._single) return { data: removed.length ? this._project(removed)[0] : null, error: removed.length ? null : { message: "no rows" } };
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
      return Promise.reject(e).catch(rej);
    }
  }
}

const db = buildSeedTables();

const fakeSupabase = {
  from(table) { return new FakeBuilder(db, table); },
};

Deno.serve({ port: 8000 }, async (request) => {
  return await handleRequest({ request, supabase: fakeSupabase });
});

console.log("Local dev server (fake Supabase, real SEED) on http://localhost:8000/");
