import { handleRequest } from "../functions/handler.mjs";

const port = parseInt(Deno.args[0] || "8000");

const fakeTables = {
  semesters: [],
  period_slots: [],
  holidays: [],
  courses: [],
  campaigns: [],
  tasks: [],
  task_completions: [],
  countdowns: [],
  settings: [{ id: 1, remind_minutes: 10, overlay_repeat: true }],
};

// Auto-seed on startup
function autoSeed() {
  const semId = crypto.randomUUID();
  fakeTables.semesters.push({
    id: semId, name: "2026秋", start_monday: "2026-09-07",
    total_weeks: 19, is_current: true, created_at: new Date().toISOString(),
  });

  const periods = [
    { slot_no: 1, start_time: "08:00", end_time: "08:45" },
    { slot_no: 2, start_time: "08:50", end_time: "09:35" },
    { slot_no: 3, start_time: "09:50", end_time: "10:35" },
    { slot_no: 4, start_time: "10:40", end_time: "11:25" },
    { slot_no: 5, start_time: "11:30", end_time: "12:15" },
    { slot_no: 6, start_time: "14:00", end_time: "14:45" },
    { slot_no: 7, start_time: "14:50", end_time: "15:35" },
    { slot_no: 8, start_time: "15:50", end_time: "16:35" },
    { slot_no: 9, start_time: "16:40", end_time: "17:25" },
    { slot_no: 10, start_time: "17:30", end_time: "18:15" },
    { slot_no: 11, start_time: "19:00", end_time: "19:45" },
    { slot_no: 12, start_time: "19:50", end_time: "20:35" },
    { slot_no: 13, start_time: "20:40", end_time: "21:25" },
    { slot_no: 14, start_time: "21:30", end_time: "22:15" },
  ];
  for (const p of periods) {
    fakeTables.period_slots.push({ id: crypto.randomUUID(), ...p });
  }

  const holidays = [
    { name: "中秋", start_date: "2026-09-20", end_date: "2026-09-20" },
    { name: "国庆", start_date: "2026-10-01", end_date: "2026-10-04" },
    { name: "校运会", start_date: "2026-10-16", end_date: "2026-10-16" },
    { name: "元旦", start_date: "2027-01-01", end_date: "2027-01-01" },
    { name: "寒假", start_date: "2027-01-18", end_date: "2027-02-28" },
  ];
  for (const h of holidays) {
    fakeTables.holidays.push({ id: crypto.randomUUID(), ...h });
  }

  const courses = [
    { name: "综合法语实训", teacher: "SAVY Sonia", weekday: 2, start_period: 2, end_period: 2, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教1-B1001", color: "#8b5cf6", note: "" },
    { name: "体育", teacher: "马申", weekday: 4, start_period: 1, end_period: 2, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "杭州田径场", color: "#ef4444", note: "" },
    { name: "习概", teacher: "孙润南", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[2,2]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "习概", teacher: "董卓宁", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[3,3]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "习概", teacher: "孙润南等", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[4,4]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "习概", teacher: "刘浩然", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[5,5],[9,9]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "习概", teacher: "关孔文", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[6,7]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "习概", teacher: "付丽莎", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[8,8]],"parity":null}', location: "R1-1040", color: "#f59e0b", note: "" },
    { name: "大学计算机基础", teacher: "黄雪飞", weekday: 2, start_period: 3, end_period: 5, week_rule: '{"ranges":[[2,11]],"parity":null}', location: "R1-3083", color: "#3b82f6", note: "" },
    { name: "大学计算机基础", teacher: "黄雪飞", weekday: 2, start_period: 3, end_period: 5, week_rule: '{"ranges":[[13,15]],"parity":null}', location: "R1-3083", color: "#3b82f6", note: "第12周新时代实践教育替代" },
    { name: "综合法语", teacher: "蔡小燕", weekday: 3, start_period: 3, end_period: 4, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-4005", color: "#10b981", note: "" },
    { name: "综合法语", teacher: "Marie", weekday: 3, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-4006", color: "#10b981", note: "" },
    { name: "数学基础", teacher: "陈欢", weekday: 4, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "R1-1001", color: "#6366f1", note: "" },
    { name: "航空航天概论A", teacher: "杨超", weekday: 5, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教1-2004", color: "#ec4899", note: "" },
    { name: "基础英语", teacher: "王金生", weekday: 2, start_period: 11, end_period: 12, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教1-4005", color: "#14b8a6", note: "" },
    { name: "心理健康", teacher: "方瑶", weekday: 3, start_period: 11, end_period: 12, week_rule: '{"ranges":[[3,3]],"parity":null}', location: "教1-2004", color: "#f97316", note: "" },
    { name: "新时代实践教育", teacher: "董卓宁", weekday: 1, start_period: 1, end_period: 2, week_rule: '{"ranges":[[12,12]],"parity":null}', location: "R1-1001", color: "#84cc16", note: "" },
    { name: "国家安全", teacher: "袁静", weekday: 3, start_period: 6, end_period: 7, week_rule: '{"ranges":[[8,8],[12,12]],"parity":null}', location: "R1-1040", color: "#a855f7", note: "" },
    { name: "数理基础法语", teacher: "待定", weekday: 5, start_period: 8, end_period: 9, week_rule: '{"ranges":[[10,17]],"parity":null}', location: "教1-5001", color: "#06b6d4", note: "" },
    { name: "工程认识", teacher: "张子琛", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[14,17]],"parity":null}', location: "待定", color: "#78716c", note: "" },
  ];
  for (const c of courses) {
    fakeTables.courses.push({ id: crypto.randomUUID(), semester_id: semId, ...c });
  }

  const tasks = [
    { title: "起床早餐", date: "2026-09-07", start_time: "07:30", end_time: "08:00", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, campaign_id: null, note: "" },
    { title: "午饭", date: "2026-09-07", start_time: "12:20", end_time: "12:45", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, campaign_id: null, note: "" },
    { title: "午休", date: "2026-09-07", start_time: "12:50", end_time: "13:30", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, campaign_id: null, note: "" },
  ];
  for (const t of tasks) {
    fakeTables.tasks.push({ id: crypto.randomUUID(), ...t, created_at: new Date().toISOString() });
  }
}

autoSeed();

function makeSupabase() {
  return {
    from(table) {
      if (!fakeTables[table]) fakeTables[table] = [];
      const rows = fakeTables[table];
      const chain = {
        _cols: null, _filters: [], _limit: null, _order: null,
        _single: false, _maybeSingle: false, _count: null,
        _inserted: null, _updateData: null, _delete: false,
        select(cols, opts) { chain._cols = cols; chain._count = opts?.count; return chain; },
        eq(col, val) { chain._filters.push({ col, op: "eq", val }); return chain; },
        neq(col, val) { chain._filters.push({ col, op: "neq", val }); return chain; },
        order(col, opts) { chain._order = { col, asc: opts?.ascending !== false }; return chain; },
        limit(n) { chain._limit = n; return chain; },
        single() { chain._single = true; return chain; },
        maybeSingle() { chain._maybeSingle = true; return chain; },
        insert(data) {
          const arr = Array.isArray(data) ? data : [data];
          const id = arr[0].id || crypto.randomUUID();
          const row = { id, ...arr[0] };
          fakeTables[table].push(row);
          chain._inserted = row;
          return chain;
        },
        update(data) { chain._updateData = data; return chain; },
        delete() { chain._delete = true; return chain; },
        async then(resolve) {
          let result = [...rows];
          for (const f of chain._filters) {
            if (f.op === "neq") {
              result = result.filter(r => r[f.col] !== f.val);
            } else {
              result = result.filter(r => r[f.col] === f.val);
            }
          }
          if (chain._order) {
            const { col, asc } = chain._order;
            result.sort((a, b) => asc ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1));
          }
          if (chain._limit) result = result.slice(0, chain._limit);

          if (chain._inserted) {
            resolve({ data: chain._inserted, error: null, count: null });
            return;
          }
          if (chain._updateData) {
            const targets = result.length ? result : rows;
            for (const r of targets) Object.assign(r, chain._updateData);
            const out = chain._maybeSingle || chain._single ? (targets[0] || null) : targets;
            resolve({ data: out, error: null, count: null });
            return;
          }
          if (chain._delete) {
            const ids = new Set(result.map(r => r.id));
            fakeTables[table] = fakeTables[table].filter(r => !ids.has(r.id));
            const out = chain._maybeSingle || chain._single ? (result[0] || null) : result;
            resolve({ data: out, error: null, count: null });
            return;
          }
          if (chain._cols) {
            const cols = chain._cols.split(",").map(c => c.trim());
            result = result.map(r => { const o = {}; for (const c of cols) o[c] = r[c]; return o; });
          }
          if (chain._count === "exact") {
            resolve({ data: result, error: null, count: result.length });
            return;
          }
          if (chain._single) {
            resolve({ data: result[0] || null, error: result[0] ? null : { message: "not found" }, count: null });
            return;
          }
          if (chain._maybeSingle) {
            resolve({ data: result[0] || null, error: null, count: null });
            return;
          }
          resolve({ data: result, error: null, count: null });
        },
      };
      return chain;
    },
  };
}

const serverHandler = async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/functions/v1/app") {
    const supabase = makeSupabase();
    return await handleRequest({ request, supabase });
  }
  return new Response("Not Found", { status: 404 });
};

Deno.serve({ hostname: "127.0.0.1", port }, serverHandler);
console.log(`Local function server: http://127.0.0.1:${port}/functions/v1/app`);
