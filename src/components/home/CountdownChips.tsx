import { type Holiday, type Countdown } from "../../store";
import { formatDate, parseDate } from "../../lib/date";

interface CountdownChipsProps {
  holidays: Holiday[];
  countdowns: Countdown[];
}

export default function CountdownChips({ holidays, countdowns }: CountdownChipsProps) {
  const today = formatDate(new Date());

  const items: { name: string; days: number; key: string }[] = [];

  for (const h of holidays) {
    if (h.end_date < today) continue;
    const start = h.start_date > today ? h.start_date : today;
    const target = parseDate(h.start_date);
    const now = parseDate(today);
    const days = Math.round((target.getTime() - now.getTime()) / 86400000);
    items.push({ name: h.name, days: Math.max(0, days), key: `h-${h.id}` });
  }

  for (const c of countdowns) {
    if (c.target_date < today) continue;
    const target = parseDate(c.target_date);
    const now = parseDate(today);
    const days = Math.round((target.getTime() - now.getTime()) / 86400000);
    items.push({ name: c.name, days: Math.max(0, days), key: `c-${c.id}` });
  }

  items.sort((a, b) => a.days - b.days);

  if (items.length === 0) return null;

  return (
    <div className="countdown-chips">
      {items.map(item => (
        <div key={item.key} className="countdown-chip">
          <span className="cd-name">{item.name}</span>
          <span className="cd-days">{item.days}天</span>
        </div>
      ))}
    </div>
  );
}
