import { useState, useEffect } from "react";
import { type Course, type PeriodSlot } from "../../store";

interface FocusCardProps {
  nextClass: { course: Course; date: string; time: string; slot: PeriodSlot; endSlot: PeriodSlot } | null;
}

export default function FocusCard({ nextClass }: FocusCardProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (!nextClass) {
    return (
      <div className="focus-card">
        <div className="focus-label">下一节课</div>
        <div className="focus-empty">今天没有课了</div>
      </div>
    );
  }

  const { course, slot, endSlot } = nextClass;
  const startTime = slot.start_time;
  const [sh, sm] = startTime.split(":").map(Number);
  const startMs = new Date(now).setHours(sh, sm, 0, 0);
  const diff = startMs - now.getTime();

  let countdownText = "";
  if (diff > 0) {
    const totalMin = Math.floor(diff / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) countdownText = `${h}时${m}分后开课`;
    else countdownText = `${m}分钟后开课`;
  } else {
    const endMs = new Date(now).setHours(
      Number(endSlot.end_time.split(":")[0]),
      Number(endSlot.end_time.split(":")[1]), 0, 0
    );
    if (now.getTime() < endMs) {
      countdownText = "正在上课中";
    } else {
      countdownText = "已结束";
    }
  }

  const color = course.color || "#4A6FA5";

  return (
    <div className="focus-card">
      <div className="focus-label">下一节课</div>
      <div className="focus-name" style={{ color }}>{course.name}</div>
      <div className="focus-detail">
        <span>{slot.slot_no}–{endSlot.slot_no}节 {startTime}–{endSlot.end_time}</span>
        <span>{course.location}</span>
      </div>
      <div className="focus-countdown" style={{ color }}>{countdownText}</div>
    </div>
  );
}
