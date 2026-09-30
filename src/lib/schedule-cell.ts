export interface TaskDraft {
  date: string;
  start_time: string;
  end_time: string;
}

function parseTime(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function formatHM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(h: number, m: number, mins: number): string {
  const total = h * 60 + m + mins;
  if (total >= 24 * 60) return "23:59";
  return formatHM(Math.floor(total / 60), total % 60);
}

export function cellToTaskDraft(
  dateStr: string,
  slot: { start_time: string; end_time: string },
): TaskDraft {
  const start = parseTime(slot.start_time);
  const startTime = start ? formatHM(start.h, start.m) : "08:00";

  const end = parseTime(slot.end_time);
  let endTime: string;
  if (end) {
    endTime = formatHM(end.h, end.m);
  } else {
    const s = start ?? { h: 8, m: 0 };
    endTime = addMinutes(s.h, s.m, 45);
  }

  return { date: dateStr, start_time: startTime, end_time: endTime };
}
