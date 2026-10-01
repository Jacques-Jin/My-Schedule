import { useMemo, useState } from "react";
import { useStore } from "../store";
import HomeworkList from "../components/homework/HomeworkList";

export default function HomeworkPage() {
  const { state } = useStore();
  const [courseFilter, setCourseFilter] = useState("");

  const coursesWithHomework = useMemo(() => {
    const ids = new Set(state.homework.map(h => String(h.course_id)));
    const matched = state.courses.filter(c => ids.has(String(c.id)));
    const map = new Map<string, { id: string; name: string; teachers: string[] }>();
    for (const c of matched) {
      const existing = map.get(c.name);
      if (existing) {
        if (c.teacher && !existing.teachers.includes(c.teacher)) {
          existing.teachers.push(c.teacher);
        }
      } else {
        map.set(c.name, { id: c.id, name: c.name, teachers: c.teacher ? [c.teacher] : [] });
      }
    }
    return [...map.values()];
  }, [state.homework, state.courses]);

  return (
    <div className="page homework-page">
      <div className="homework-page-header">
        <h2>作业汇总</h2>
      </div>

      <div className="filter-chips">
        <button
          className={`filter-chip ${courseFilter === "" ? "active" : ""}`}
          onClick={() => setCourseFilter("")}
        >
          全部
        </button>
        {coursesWithHomework.map(c => (
          <button
            key={c.name}
            className={`filter-chip ${courseFilter === c.name ? "active" : ""}`}
            onClick={() => setCourseFilter(courseFilter === c.name ? "" : c.name)}
          >
            {c.name}{c.teachers.length > 0 ? `（${c.teachers.join("、")}）` : ""}
          </button>
        ))}
      </div>

      <HomeworkList grouped courseFilter={courseFilter || undefined} />
    </div>
  );
}
