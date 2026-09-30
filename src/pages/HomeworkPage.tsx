import { useMemo, useState } from "react";
import { useStore } from "../store";
import HomeworkList from "../components/homework/HomeworkList";

export default function HomeworkPage() {
  const { state } = useStore();
  const [courseFilter, setCourseFilter] = useState("");

  const coursesWithHomework = useMemo(() => {
    const ids = new Set(state.homework.map(h => h.course_id));
    return state.courses.filter(c => ids.has(c.id));
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
            key={c.id}
            className={`filter-chip ${courseFilter === c.id ? "active" : ""}`}
            onClick={() => setCourseFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <HomeworkList grouped courseFilter={courseFilter || undefined} />
    </div>
  );
}
