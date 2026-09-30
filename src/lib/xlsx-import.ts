import * as XLSX from "xlsx";

export interface ParsedCourse {
  name: string;
  teacher: string;
  weekday: number;
  start_period: number;
  end_period: number;
  week_rule: string;
  location: string;
  color: string;
  note: string;
}

const LOCATION_MAP: [RegExp, string][] = [
  [/^教学一号楼/, "教1-"],
  [/^教学二号楼/, "教2-"],
  [/^科研一号楼/, "R1-"],
  [/^计算机房（(.+?)）/, "$1"],
  [/^不使用教室/, ""],
];

function normalizeLocation(raw: string): string {
  let loc = raw.trim();
  for (const [re, rep] of LOCATION_MAP) {
    const m = loc.match(re);
    if (m) {
      loc = rep.includes("$1") ? loc.replace(re, rep) : rep + loc.replace(re, "");
      break;
    }
  }
  return loc;
}

function normalizeName(raw: string): string {
  return raw
    .replace(/^（本）/, "")
    .replace(/\(1\)$/, "")
    .replace(/（1）$/, "")
    .trim();
}

function parseWeekRanges(weekStr: string): [number, number][] {
  const ranges: [number, number][] = [];
  const parts = weekStr.replace(/周/g, "").split(/[,，\n]/);
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      ranges.push([Number(rangeMatch[1]), Number(rangeMatch[2])]);
    } else {
      const singleMatch = trimmed.match(/^(\d+)$/);
      if (singleMatch) {
        const n = Number(singleMatch[1]);
        ranges.push([n, n]);
      }
    }
  }
  return ranges;
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1] + 1) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

function parseTeacherLine(raw: string): { teachers: string[]; ranges: [number, number][] } {
  const teachers: string[] = [];
  const allRanges: [number, number][] = [];
  const re = /([^\[,，]+)\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1].replace(/[,，]/g, "").trim();
    if (name) teachers.push(name);
    allRanges.push(...parseWeekRanges(m[2]));
  }
  if (teachers.length === 0) {
    return { teachers: [raw.trim()], ranges: [] };
  }
  return { teachers, ranges: mergeRanges(allRanges) };
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
  "#14b8a6", "#a855f7", "#78716c", "#0ea5e9", "#d946ef",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith("（本）") && current.length > 0) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

function parseBlock(block: string[], weekday: number): ParsedCourse | null {
  if (block.length < 3) return null;

  const name = normalizeName(block[0]);
  if (!name) return null;

  const periodLine = block[block.length - 1];
  const periodMatch = periodLine.match(/第(\d+)\s*[-–]\s*(\d+)节/);
  if (!periodMatch) return null;
  const start_period = Number(periodMatch[1]);
  const end_period = Number(periodMatch[2]);

  const location = normalizeLocation(block[block.length - 2]);

  const teacherLines = block.slice(1, block.length - 2);
  const teacherRaw = teacherLines.join("\n");
  const { teachers, ranges } = parseTeacherLine(teacherRaw);

  return {
    name,
    teacher: teachers.join(", "),
    weekday,
    start_period,
    end_period,
    week_rule: JSON.stringify({ ranges, parity: null }),
    location,
    color: colorForName(name),
    note: "",
  };
}

export function parseScheduleXlsx(file: ArrayBuffer): ParsedCourse[] {
  const wb = XLSX.read(file, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("xlsx 文件中没有工作表");

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const courses: ParsedCourse[] = [];
  const seen = new Set<string>();
  const dataRows = [4, 10, 16, 22, 28];
  const colToWeekday: Record<string, number> = { C: 1, D: 2, E: 3, F: 4, G: 5, H: 6, I: 7 };

  for (const row of dataRows) {
    if (row > range.e.r + 1) continue;
    for (const [col, weekday] of Object.entries(colToWeekday)) {
      const addr = `${col}${row}`;
      const cell = ws[addr];
      if (!cell || !cell.v) continue;
      const text = String(cell.v).trim();
      if (!text) continue;

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const blocks = splitBlocks(lines);

      for (const block of blocks) {
        const parsed = parseBlock(block, weekday);
        if (!parsed) continue;

        const key = `${parsed.name}|${parsed.teacher}|${weekday}|${parsed.start_period}|${parsed.end_period}|${parsed.week_rule}`;
        if (seen.has(key)) continue;
        seen.add(key);
        courses.push(parsed);
      }
    }
  }

  return courses;
}
