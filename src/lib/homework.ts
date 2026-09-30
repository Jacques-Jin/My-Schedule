import type { Homework } from "../store";

export interface HomeworkGroup {
  key: "overdue" | "today" | "thisWeek" | "later" | "noDue" | "completed";
  label: string;
  items: Homework[];
  variant?: "overdue" | "dueToday";
}

function byDueDate(a: Homework, b: Homework): number {
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date.localeCompare(b.due_date);
}

export function groupHomework(list: Homework[], todayStr: string): HomeworkGroup[] {
  const d = new Date(todayStr + "T00:00:00");
  const daysUntilSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  const weekEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const groups: Record<HomeworkGroup["key"], Homework[]> = {
    overdue: [], today: [], thisWeek: [], later: [], noDue: [], completed: [],
  };

  for (const hw of list) {
    if (hw.completed) { groups.completed.push(hw); continue; }
    if (!hw.due_date) { groups.noDue.push(hw); continue; }
    if (hw.due_date < todayStr) groups.overdue.push(hw);
    else if (hw.due_date === todayStr) groups.today.push(hw);
    else if (hw.due_date <= weekEnd) groups.thisWeek.push(hw);
    else groups.later.push(hw);
  }

  for (const key of Object.keys(groups) as HomeworkGroup["key"][]) {
    groups[key].sort(byDueDate);
  }

  return [
    { key: "overdue", label: "已逾期", items: groups.overdue, variant: "overdue" },
    { key: "today", label: "今天到期", items: groups.today, variant: "dueToday" },
    { key: "thisWeek", label: "本周内", items: groups.thisWeek },
    { key: "later", label: "之后", items: groups.later },
    { key: "noDue", label: "无截止日期", items: groups.noDue },
    { key: "completed", label: "已完成", items: groups.completed },
  ];
}
