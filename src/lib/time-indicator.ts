import type { PeriodSlot } from "./date";

export interface NowPosition {
  slotNo: number;
  ratio: number;
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function getNowPosition(now: Date, slots: PeriodSlot[]): NowPosition | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sorted = [...slots].sort((a, b) => a.slot_no - b.slot_no);

  for (const slot of sorted) {
    const start = toMinutes(slot.start_time);
    const end = toMinutes(slot.end_time);
    if (nowMin >= start && nowMin <= end) {
      const ratio = end > start ? (nowMin - start) / (end - start) : 0;
      return { slotNo: slot.slot_no, ratio };
    }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const endThis = toMinutes(sorted[i].end_time);
    const startNext = toMinutes(sorted[i + 1].start_time);
    if (nowMin > endThis && nowMin < startNext) {
      return { slotNo: sorted[i].slot_no, ratio: 1 };
    }
  }

  return null;
}

export function getNowDayPart(now: Date, slots: PeriodSlot[]): "morning" | "afternoon" | "evening" | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sorted = [...slots].sort((a, b) => a.slot_no - b.slot_no);
  if (sorted.length === 0) return null;
  const first = toMinutes(sorted[0].start_time);
  const last = toMinutes(sorted[sorted.length - 1].end_time);
  if (nowMin < first || nowMin > last) return null;

  const pos = getNowPosition(now, slots);
  const slotNo = pos ? pos.slotNo : findNearestSlotBefore(sorted, nowMin);
  if (slotNo <= 5) return "morning";
  if (slotNo <= 10) return "afternoon";
  return "evening";
}

function findNearestSlotBefore(sorted: PeriodSlot[], nowMin: number): number {
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (toMinutes(sorted[i].end_time) <= nowMin) return sorted[i].slot_no;
  }
  return sorted[0].slot_no;
}
