// Validation helpers — whitelist fields, enforce types
function validateSemester(p) {
  if (!p.name || typeof p.name !== "string") return "invalid_name";
  if (!p.start_monday || !/^\d{4}-\d{2}-\d{2}$/.test(p.start_monday)) return "invalid_start_monday";
  if (typeof p.total_weeks !== "number" || p.total_weeks < 1 || p.total_weeks > 52) return "invalid_total_weeks";
  return null;
}

function validateHoliday(p) {
  if (!p.name || typeof p.name !== "string") return "invalid_name";
  if (!p.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(p.start_date)) return "invalid_start_date";
  if (!p.end_date || !/^\d{4}-\d{2}-\d{2}$/.test(p.end_date)) return "invalid_end_date";
  return null;
}

function validateCourse(p) {
  if (!p.name || typeof p.name !== "string") return "invalid_name";
  if (typeof p.weekday !== "number" || p.weekday < 1 || p.weekday > 7) return "invalid_weekday";
  if (typeof p.start_period !== "number" || p.start_period < 1 || p.start_period > 14) return "invalid_start_period";
  if (typeof p.end_period !== "number" || p.end_period < 1 || p.end_period > 14) return "invalid_end_period";
  if (!p.week_rule) return "invalid_week_rule";
  try { JSON.parse(p.week_rule); } catch { return "invalid_week_rule"; }
  return null;
}

function validateTask(p) {
  if (!p.title || typeof p.title !== "string") return "invalid_title";
  if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "invalid_date";
  return null;
}

function validateCampaign(p) {
  if (!p.name || typeof p.name !== "string") return "invalid_name";
  return null;
}

function validateCountdown(p) {
  if (!p.name || typeof p.name !== "string") return "invalid_name";
  if (!p.target_date || !/^\d{4}-\d{2}-\d{2}$/.test(p.target_date)) return "invalid_target_date";
  return null;
}

function validateComplete(p) {
  if (!p.id) return "missing_id";
  if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "invalid_date";
  if (typeof p.done !== "boolean") return "invalid_done";
  return null;
}

function validateDayOverride(p) {
  if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "invalid_date";
  if (p.kind !== "holiday" && p.kind !== "classday") return "invalid_kind";
  if (p.follow_weekday !== undefined && p.follow_weekday !== null) {
    if (typeof p.follow_weekday !== "number" || p.follow_weekday < 1 || p.follow_weekday > 7) return "invalid_follow_weekday";
  }
  if (p.name !== undefined && p.name !== null && typeof p.name === "string" && p.name.length > 30) return "invalid_name";
  return null;
}

// Pick only whitelisted fields from obj
function pick(obj, fields) {
  const result = {};
  for (const f of fields) {
    if (obj[f] !== undefined) result[f] = obj[f];
  }
  return result;
}

// Seed data (imported inline to keep handler self-contained for Deno)
export const SEED = {
  semester: { name: "2026秋", start_monday: "2026-09-07", total_weeks: 19, is_current: true },
  holidays: [
    { name: "中秋", start_date: "2026-09-20", end_date: "2026-09-20" },
    { name: "国庆", start_date: "2026-10-01", end_date: "2026-10-04" },
    { name: "校运会", start_date: "2026-10-16", end_date: "2026-10-16" },
    { name: "元旦", start_date: "2027-01-01", end_date: "2027-01-01" },
    { name: "寒假", start_date: "2027-01-18", end_date: "2027-02-28" },
  ],
  periods: [
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
  ],
  courses: [
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
    { name: "综合法语", teacher: "SCHLEIFER", weekday: 1, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-4006", color: "#10b981", note: "" },
    { name: "综合法语", teacher: "SCHLEIFER", weekday: 2, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-4006", color: "#10b981", note: "" },
    { name: "综合法语实训", teacher: "SCHLEIFER", weekday: 4, start_period: 3, end_period: 4, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-5003", color: "#8b5cf6", note: "" },
    { name: "综合法语", teacher: "蔡小燕", weekday: 4, start_period: 11, end_period: 12, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教2-4005", color: "#10b981", note: "" },
    { name: "数学基础", teacher: "陈欢", weekday: 4, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "R1-1001", color: "#6366f1", note: "" },
    { name: "航空航天概论A", teacher: "杨超", weekday: 5, start_period: 6, end_period: 7, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教1-2004", color: "#ec4899", note: "" },
    { name: "基础英语", teacher: "王金生", weekday: 2, start_period: 11, end_period: 12, week_rule: '{"ranges":[[2,17]],"parity":null}', location: "教1-4005", color: "#14b8a6", note: "" },
    { name: "心理健康", teacher: "方瑶", weekday: 3, start_period: 11, end_period: 12, week_rule: '{"ranges":[[3,3]],"parity":null}', location: "教1-2004", color: "#f97316", note: "" },
    { name: "新时代实践教育", teacher: "董卓宁", weekday: 1, start_period: 1, end_period: 2, week_rule: '{"ranges":[[12,12]],"parity":null}', location: "R1-1001", color: "#84cc16", note: "" },
    { name: "新时代实践教育", teacher: "董卓宁", weekday: 2, start_period: 3, end_period: 4, week_rule: '{"ranges":[[12,12]],"parity":null}', location: "R1-1055", color: "#84cc16", note: "" },
    { name: "国家安全", teacher: "袁静", weekday: 3, start_period: 6, end_period: 7, week_rule: '{"ranges":[[8,8],[12,12]],"parity":null}', location: "R1-1040", color: "#a855f7", note: "" },
    { name: "数理基础法语", teacher: "待定", weekday: 4, start_period: 8, end_period: 9, week_rule: '{"ranges":[[10,17]],"parity":null}', location: "教1-5001", color: "#06b6d4", note: "" },
    { name: "工程认识", teacher: "张子琛", weekday: 5, start_period: 1, end_period: 4, week_rule: '{"ranges":[[14,17]],"parity":null}', location: "待定", color: "#78716c", note: "" },
    { name: "素质教育博雅课程", teacher: "赵云朋", weekday: 1, start_period: 1, end_period: 1, week_rule: '{"ranges":[],"parity":null}', location: "不排课", color: "#94a3b8", note: "4-6双周/8-14双周，不排课，仅备注展示" },
  ],
  tasks: [
    { title: "起床早餐", date: "2026-09-07", start_time: "07:30", end_time: "08:00", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
    { title: "午饭", date: "2026-09-07", start_time: "12:20", end_time: "12:45", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
    { title: "午休", date: "2026-09-07", start_time: "12:50", end_time: "13:30", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
  ],
  settings: { remind_minutes: 10, overlay_repeat: true, theme: "default" },
};

async function seedIfEmpty(supabase) {
  const { data, error } = await supabase.from("semesters").select("id").limit(1);
  if (error) throw new Error("seed_check_failed");
  if (data && data.length > 0) return { seeded: false };

  const { data: sem } = await supabase.from("semesters")
    .insert({ ...SEED.semester, created_at: new Date().toISOString() })
    .select("id")
    .single();
  if (!sem) throw new Error("seed_semester_failed");

  for (const p of SEED.periods) {
    await supabase.from("period_slots").insert(p);
  }
  for (const h of SEED.holidays) {
    await supabase.from("holidays").insert(h);
  }
  for (const c of SEED.courses) {
    await supabase.from("courses").insert({ ...c, semester_id: sem.id });
  }
  for (const t of SEED.tasks) {
    await supabase.from("tasks").insert({ ...t, campaign_id: null, created_at: new Date().toISOString() });
  }
  await supabase.from("settings").insert({ id: 1, ...SEED.settings });

  return { seeded: true };
}

const actions = {
  bootstrap: async ({ supabase }) => {
    const tables = [
      ["semesters", "id,name,start_monday,total_weeks,is_current,created_at"],
      ["period_slots", "id,slot_no,start_time,end_time"],
      ["holidays", "id,name,start_date,end_date"],
      ["courses", "id,semester_id,name,teacher,weekday,start_period,end_period,week_rule,location,color,note"],
      ["campaigns", "id,name,goal,deadline,color,created_at"],
      ["tasks", "id,title,date,start_time,end_time,category,priority,repeat_rule,reminder,done,campaign_id,note,created_at"],
      ["task_completions", "id,task_id,date"],
      ["countdowns", "id,name,target_date"],
      ["homework", "id,title,course_id,due_date,description,completed,created_at"],
      ["day_overrides", "id,date,kind,follow_weekday,name,created_at"],
      ["settings", "id,remind_minutes,overlay_repeat,theme"],
    ];
    const result = {};
    for (const [table, cols] of tables) {
      const { data, error } = await supabase.from(table).select(cols).limit(2000);
      if (error) throw new Error("bootstrap_failed");
      result[table] = data || [];
    }
    const settingsRow = result.settings[0] || { id: 1, remind_minutes: 10, overlay_repeat: true };
    if (settingsRow.theme === undefined) settingsRow.theme = "default";
    return {
      semesters: result.semesters,
      periodSlots: result.period_slots,
      holidays: result.holidays,
      courses: result.courses,
      campaigns: result.campaigns,
      tasks: result.tasks,
      completions: result.task_completions,
      countdowns: result.countdowns,
      homework: result.homework,
      dayOverrides: result.day_overrides,
      settings: settingsRow,
    };
  },

  "seed.ifEmpty": async ({ supabase }) => {
    return await seedIfEmpty(supabase);
  },

  "semester.save": async ({ supabase, payload }) => {
    const err = validateSemester(payload);
    if (err) throw new Error(err);
    const fields = ["name", "start_monday", "total_weeks", "is_current"];
    const data = pick(payload, fields);
    if (payload.id) {
      const { data: row, error } = await supabase.from("semesters").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("semester_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("semesters")
      .insert({ ...data, created_at: new Date().toISOString() })
      .select("*").single();
    if (error) throw new Error("semester_insert_failed");
    return row;
  },

  "semester.setCurrent": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { error: e1 } = await supabase.from("semesters").update({ is_current: false }).eq("is_current", true);
    if (e1) throw new Error("semester_set_current_failed");
    const { data: row, error } = await supabase.from("semesters").update({ is_current: true }).eq("id", payload.id).select("*").single();
    if (error) throw new Error("semester_set_current_failed");
    return row;
  },

  "semester.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { data: sem } = await supabase.from("semesters").select("is_current").eq("id", payload.id).single();
    if (sem && sem.is_current) throw new Error("cannot_delete_current");
    const { error } = await supabase.from("semesters").delete().eq("id", payload.id);
    if (error) throw new Error("semester_delete_failed");
    return { deleted: true };
  },

  "holiday.save": async ({ supabase, payload }) => {
    const err = validateHoliday(payload);
    if (err) throw new Error(err);
    const data = pick(payload, ["name", "start_date", "end_date"]);
    if (payload.id) {
      const { data: row, error } = await supabase.from("holidays").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("holiday_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("holidays").insert(data).select("*").single();
    if (error) throw new Error("holiday_insert_failed");
    return row;
  },

  "holiday.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { error } = await supabase.from("holidays").delete().eq("id", payload.id);
    if (error) throw new Error("holiday_delete_failed");
    return { deleted: true };
  },

  "period.save": async ({ supabase, payload }) => {
    if (!Array.isArray(payload.slots)) throw new Error("invalid_slots");
    for (const s of payload.slots) {
      if (typeof s.slot_no !== "number" || !s.start_time || !s.end_time) throw new Error("invalid_slot");
    }
    const results = [];
    for (const s of payload.slots) {
      if (s.id) {
        const { data: row } = await supabase.from("period_slots")
          .update({ start_time: s.start_time, end_time: s.end_time })
          .eq("id", s.id).select("*").single();
        results.push(row);
      } else {
        const { data: row } = await supabase.from("period_slots")
          .insert({ slot_no: s.slot_no, start_time: s.start_time, end_time: s.end_time })
          .select("*").single();
        results.push(row);
      }
    }
    return results;
  },

  "course.save": async ({ supabase, payload }) => {
    const err = validateCourse(payload);
    if (err) throw new Error(err);
    const fields = ["semester_id", "name", "teacher", "weekday", "start_period", "end_period", "week_rule", "location", "color", "note"];
    const data = pick(payload, fields);
    if (payload.id) {
      const { data: row, error } = await supabase.from("courses").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("course_update_failed");
      return row;
    }
    if (!data.semester_id) throw new Error("missing_semester_id");
    const { data: row, error } = await supabase.from("courses").insert(data).select("*").single();
    if (error) throw new Error("course_insert_failed");
    return row;
  },

  "course.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { error } = await supabase.from("courses").delete().eq("id", payload.id);
    if (error) throw new Error("course_delete_failed");
    return { deleted: true };
  },

  "task.save": async ({ supabase, payload }) => {
    const err = validateTask(payload);
    if (err) throw new Error(err);
    const fields = ["title", "date", "start_time", "end_time", "category", "priority", "repeat_rule", "reminder", "done", "campaign_id", "note"];
    const data = pick(payload, fields);
    if (payload.id) {
      const { data: row, error } = await supabase.from("tasks").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("task_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("tasks")
      .insert({ ...data, created_at: new Date().toISOString() })
      .select("*").single();
    if (error) throw new Error("task_insert_failed");
    return row;
  },

  "task.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    await supabase.from("task_completions").delete().eq("task_id", payload.id);
    const { error } = await supabase.from("tasks").delete().eq("id", payload.id);
    if (error) throw new Error("task_delete_failed");
    return { deleted: true };
  },

  "task.batch": async ({ supabase, payload }) => {
    const { ids, op, payload: opPayload } = payload;
    if (!Array.isArray(ids) || ids.length === 0) throw new Error("invalid_ids");
    if (!op) throw new Error("invalid_op");

    const results = [];
    for (const id of ids) {
      switch (op) {
        case "done":
        case "undone": {
          const { data: task } = await supabase.from("tasks").select("repeat_rule").eq("id", id).single();
          if (task && task.repeat_rule && JSON.parse(task.repeat_rule).type !== "none") {
            const date = opPayload?.date;
            if (!date) throw new Error("missing_date_for_repeat_task");
            if (op === "done") {
              await supabase.from("task_completions").insert({ task_id: id, date });
            } else {
              await supabase.from("task_completions").delete().eq("task_id", id).eq("date", date);
            }
          } else {
            await supabase.from("tasks").update({ done: op === "done" }).eq("id", id);
          }
          break;
        }
        case "delete":
          await supabase.from("task_completions").delete().eq("task_id", id);
          await supabase.from("tasks").delete().eq("id", id);
          break;
        case "move": {
          if (!opPayload?.date) throw new Error("missing_date");
          await supabase.from("tasks").update({ date: opPayload.date }).eq("id", id);
          break;
        }
        case "category": {
          if (!opPayload?.category) throw new Error("missing_category");
          await supabase.from("tasks").update({ category: opPayload.category }).eq("id", id);
          break;
        }
        default:
          throw new Error("unknown_op");
      }
      results.push(id);
    }
    return { updated: results };
  },

  "task.complete": async ({ supabase, payload }) => {
    const err = validateComplete(payload);
    if (err) throw new Error(err);
    const { data: task } = await supabase.from("tasks").select("repeat_rule").eq("id", payload.id).single();
    if (!task) throw new Error("task_not_found");
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      if (payload.done) {
        await supabase.from("task_completions").insert({ task_id: payload.id, date: payload.date });
      } else {
        await supabase.from("task_completions").delete().eq("task_id", payload.id).eq("date", payload.date);
      }
    } else {
      await supabase.from("tasks").update({ done: payload.done }).eq("id", payload.id);
    }
    return { done: payload.done };
  },

  "campaign.save": async ({ supabase, payload }) => {
    const err = validateCampaign(payload);
    if (err) throw new Error(err);
    const fields = ["name", "goal", "deadline", "color"];
    const data = pick(payload, fields);
    if (payload.id) {
      const { data: row, error } = await supabase.from("campaigns").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("campaign_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("campaigns")
      .insert({ ...data, created_at: new Date().toISOString() })
      .select("*").single();
    if (error) throw new Error("campaign_insert_failed");
    return row;
  },

  "campaign.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    await supabase.from("tasks").update({ campaign_id: null }).eq("campaign_id", payload.id);
    const { error } = await supabase.from("campaigns").delete().eq("id", payload.id);
    if (error) throw new Error("campaign_delete_failed");
    return { deleted: true };
  },

  "campaign.attach": async ({ supabase, payload }) => {
    const { campaignId, taskIds } = payload;
    if (!Array.isArray(taskIds)) throw new Error("invalid_task_ids");
    for (const tid of taskIds) {
      await supabase.from("tasks").update({ campaign_id: campaignId || null }).eq("id", tid);
    }
    return { attached: taskIds };
  },

  "countdown.save": async ({ supabase, payload }) => {
    const err = validateCountdown(payload);
    if (err) throw new Error(err);
    const data = pick(payload, ["name", "target_date"]);
    if (payload.id) {
      const { data: row, error } = await supabase.from("countdowns").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("countdown_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("countdowns").insert(data).select("*").single();
    if (error) throw new Error("countdown_insert_failed");
    return row;
  },

  "countdown.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { error } = await supabase.from("countdowns").delete().eq("id", payload.id);
    if (error) throw new Error("countdown_delete_failed");
    return { deleted: true };
  },

  "dayOverride.save": async ({ supabase, payload }) => {
    const err = validateDayOverride(payload);
    if (err) throw new Error(err);
    const fields = ["date", "kind", "follow_weekday", "name"];
    const data = pick(payload, fields);
    data.follow_weekday = data.follow_weekday ?? null;
    data.name = data.name ?? null;
    if (data.kind === "holiday") data.follow_weekday = null;

    const { data: existing } = await supabase.from("day_overrides").select("id").eq("date", data.date).maybeSingle();
    if (existing && (!payload.id || existing.id !== payload.id)) {
      const { data: row, error } = await supabase.from("day_overrides").update(data).eq("id", existing.id).select("*").single();
      if (error) throw new Error("day_override_update_failed");
      return row;
    }

    if (payload.id) {
      const { data: row, error } = await supabase.from("day_overrides").update(data).eq("id", payload.id).select("*").single();
      if (error) throw new Error("day_override_update_failed");
      return row;
    }
    const { data: row, error } = await supabase.from("day_overrides")
      .insert({ ...data, created_at: new Date().toISOString() })
      .select("*").single();
    if (error) throw new Error("day_override_insert_failed");
    return row;
  },

  "dayOverride.delete": async ({ supabase, payload }) => {
    if (payload.id) {
      const { error } = await supabase.from("day_overrides").delete().eq("id", payload.id);
      if (error) throw new Error("day_override_delete_failed");
    } else if (payload.date) {
      const { error } = await supabase.from("day_overrides").delete().eq("date", payload.date);
      if (error) throw new Error("day_override_delete_failed");
    } else {
      throw new Error("missing_id_or_date");
    }
    return { deleted: true };
  },

  "settings.save": async ({ supabase, payload }) => {
    const fields = ["remind_minutes", "overlay_repeat", "theme"];
    const data = pick(payload, fields);
    const { data: row, error } = await supabase.from("settings").update(data).eq("id", 1).select("*").single();
    if (error || !row) {
      const { data: inserted, error: e2 } = await supabase.from("settings").insert({ id: 1, ...data }).select("*").single();
      if (e2) throw new Error("settings_save_failed");
      return inserted;
    }
    if (row.theme === undefined) row.theme = payload.theme || "default";
    return row;
  },

  "data.export": async ({ supabase }) => {
    const tables = ["semesters", "period_slots", "holidays", "courses", "campaigns", "tasks", "task_completions", "countdowns", "homework", "day_overrides", "settings"];
    const result = {};
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*").limit(10000);
      if (error) throw new Error("export_failed");
      result[table] = data || [];
    }
    return result;
  },

  "data.import": async ({ supabase, payload }) => {
    if (!payload || typeof payload !== "object") throw new Error("invalid_payload");

    const strip = (row) => {
      const { id, created_at, ...rest } = row;
      return rest;
    };

    const tables = ["semesters", "period_slots", "holidays", "courses", "campaigns", "tasks", "task_completions", "countdowns", "homework", "day_overrides", "settings"];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().not("id", "is", null);
      if (error) throw new Error(`clear ${table}: ${error.message}`);
    }

    const CREATED_AT_TABLES = new Set(["semesters", "campaigns", "tasks", "homework", "day_overrides"]);
    const prep = (row, table) => {
      const clean = strip(row);
      clean.id = row.id || crypto.randomUUID();
      if (CREATED_AT_TABLES.has(table)) clean.created_at = row.created_at || new Date().toISOString();
      return clean;
    };

    const idMap = {};
    const insertedIds = {};
    const buildMap = async (table) => {
      const rows = payload[table];
      if (!Array.isArray(rows) || rows.length === 0) return;
      idMap[table] = {};
      insertedIds[table] = [];
      for (const row of rows) {
        const { data: inserted, error } = await supabase.from(table).insert(prep(row, table)).select("id").single();
        if (error) throw new Error(`insert ${table}: ${error.message}`);
        insertedIds[table].push(inserted.id);
        if (row.id) idMap[table][row.id] = inserted.id;
      }
    };

    await buildMap("semesters");
    await buildMap("period_slots");
    await buildMap("holidays");

    const courseRows = payload.courses;
    if (Array.isArray(courseRows) && courseRows.length > 0) {
      const fallbackSem = insertedIds.semesters?.[0] || null;
      for (const row of courseRows) {
        const clean = prep(row, "courses");
        if (row.semester_id && idMap.semesters?.[row.semester_id]) {
          clean.semester_id = idMap.semesters[row.semester_id];
        } else if (!clean.semester_id) {
          clean.semester_id = fallbackSem;
        }
        const { error } = await supabase.from("courses").insert(clean);
        if (error) throw new Error(`insert courses: ${error.message}`);
      }
    }

    await buildMap("campaigns");

    const taskRows = payload.tasks;
    if (Array.isArray(taskRows) && taskRows.length > 0) {
      if (!idMap.tasks) idMap.tasks = {};
      for (const row of taskRows) {
        const clean = prep(row, "tasks");
        if (row.campaign_id && idMap.campaigns?.[row.campaign_id]) {
          clean.campaign_id = idMap.campaigns[row.campaign_id];
        }
        const { data: inserted, error } = await supabase.from("tasks").insert(clean).select("id").single();
        if (error) throw new Error(`insert tasks: ${error.message}`);
        if (inserted && row.id) idMap.tasks[row.id] = inserted.id;
      }
    }

    const tcRows = payload.task_completions;
    if (Array.isArray(tcRows) && tcRows.length > 0) {
      for (const row of tcRows) {
        const clean = prep(row, "task_completions");
        if (row.task_id && idMap.tasks?.[row.task_id]) {
          clean.task_id = idMap.tasks[row.task_id];
        }
        const { error } = await supabase.from("task_completions").insert(clean);
        if (error) throw new Error(`insert task_completions: ${error.message}`);
      }
    }

    await buildMap("countdowns");

    const dayOverrideRows = payload.day_overrides;
    if (Array.isArray(dayOverrideRows) && dayOverrideRows.length > 0) {
      for (const row of dayOverrideRows) {
        const clean = prep(row, "day_overrides");
        const { error } = await supabase.from("day_overrides").insert(clean);
        if (error) throw new Error(`insert day_overrides: ${error.message}`);
      }
    }

    const homeworkRows = payload.homework;
    if (Array.isArray(homeworkRows) && homeworkRows.length > 0) {
      for (const row of homeworkRows) {
        const clean = prep(row, "homework");
        if (row.course_id && idMap.courses?.[row.course_id]) {
          clean.course_id = idMap.courses[row.course_id];
        }
        if (!clean.course_id) continue;
        const { error } = await supabase.from("homework").insert(clean);
        if (error) throw new Error(`insert homework: ${error.message}`);
      }
    }

    const settingsData = payload.settings;
    if (settingsData) {
      const clean = typeof settingsData === "object" && !Array.isArray(settingsData)
        ? strip(settingsData)
        : Array.isArray(settingsData) && settingsData.length > 0
          ? strip(settingsData[0])
          : null;
      if (clean) {
        const { error } = await supabase.from("settings").upsert({ id: 1, ...clean });
        if (error) throw new Error(`insert settings: ${error.message}`);
      }
    }

    return { imported: true };
  },

  "homework.save": async ({ supabase, payload }) => {
    if (!payload.title || typeof payload.title !== "string") throw new Error("invalid_title");
    if (!payload.course_id) throw new Error("missing_course_id");
    const row = pick(payload, ["title", "course_id", "due_date", "description", "completed"]);
    if (payload.id) {
      const { data, error } = await supabase.from("homework").update(row).eq("id", payload.id).select().single();
      if (error) throw new Error("update_homework_failed");
      return data;
    }
    const insertRow = { completed: false, created_at: new Date().toISOString(), ...row };
    const { data, error } = await supabase.from("homework").insert(insertRow).select().single();
    if (error) throw new Error("insert_homework_failed");
    return data;
  },

  "homework.delete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    const { error } = await supabase.from("homework").delete().eq("id", payload.id);
    if (error) throw new Error("delete_homework_failed");
    return { deleted: true };
  },

  "homework.complete": async ({ supabase, payload }) => {
    if (!payload.id) throw new Error("missing_id");
    if (typeof payload.completed !== "boolean") throw new Error("invalid_completed");
    const { data, error } = await supabase.from("homework").update({ completed: payload.completed }).eq("id", payload.id).select().single();
    if (error) throw new Error("update_homework_failed");
    return data;
  },
};

export async function handleRequest({ request, supabase }) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { ...headers, Allow: "GET, POST" } });
  }
  if (!action) return Response.json({ error: "missing_action" }, { status: 400, headers });

  const fn = actions[action];
  if (!fn) return Response.json({ error: "unknown_action" }, { status: 404, headers });

  try {
    let payload = {};
    if (request.method === "POST") {
      const ct = request.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        return Response.json({ error: "invalid_content_type" }, { status: 400, headers });
      }
      const text = await request.text();
      if (text.length > 100000) {
        return Response.json({ error: "payload_too_large" }, { status: 413, headers });
      }
      if (text) payload = JSON.parse(text);
    }
    const data = await fn({ supabase, payload });
    return Response.json({ ok: true, data }, { status: 200, headers });
  } catch (e) {
    const code = e?.message || "internal_error";
    return Response.json({ error: code }, { status: 503, headers });
  }
}
