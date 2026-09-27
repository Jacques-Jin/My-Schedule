// Seed data constants for 2026 Fall semester
// Source: parsed_schedules.txt + 学期课表.xlsx

export const SEMESTER = {
  name: "2026秋",
  start_monday: "2026-09-07",
  total_weeks: 19,
  is_current: true,
};

export const HOLIDAYS = [
  { name: "中秋", start_date: "2026-09-20", end_date: "2026-09-20" },
  { name: "国庆", start_date: "2026-10-01", end_date: "2026-10-04" },
  { name: "校运会", start_date: "2026-10-16", end_date: "2026-10-16" },
  { name: "元旦", start_date: "2027-01-01", end_date: "2027-01-01" },
  { name: "寒假", start_date: "2027-01-18", end_date: "2027-02-28" },
];

export const PERIODS = [
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

// Courses — semester_id placeholder replaced at seed time
export const COURSES = [
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

export const TASKS = [
  { title: "起床早餐", date: "2026-09-07", start_time: "07:30", end_time: "08:00", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
  { title: "午饭", date: "2026-09-07", start_time: "12:20", end_time: "12:45", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
  { title: "午休", date: "2026-09-07", start_time: "12:50", end_time: "13:30", category: "生活", priority: "中", repeat_rule: '{"type":"daily"}', reminder: "none", done: false, note: "" },
];

export const SETTINGS = { remind_minutes: 10, overlay_repeat: true };
