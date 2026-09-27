import type { Course } from "../../store";

interface CourseBlockProps {
  course: Course;
  startPeriod: number;
  endPeriod: number;
  onClick: () => void;
  isGhost?: boolean;
  gridRow?: number;
  gridColumn?: number;
  rowSpan?: number;
}

export default function CourseBlock({ course, startPeriod, endPeriod, onClick, isGhost, gridRow, gridColumn, rowSpan }: CourseBlockProps) {
  const bgColor = isGhost ? "transparent" : (course.color || "#4f46e5");

  const style: React.CSSProperties = {
    "--block-bg": bgColor,
    "--block-border": course.color || "#4f46e5",
  } as React.CSSProperties;

  if (gridRow !== undefined) style.gridRow = gridRow;
  if (gridColumn !== undefined) style.gridColumn = gridColumn;
  if (rowSpan !== undefined) style.gridRow = `${gridRow} / span ${rowSpan}`;

  return (
    <div
      className={`course-block ${isGhost ? "ghost" : ""}`}
      style={style}
      onClick={onClick}
    >
      <span className="course-block-name">{course.name}</span>
      <span className="course-block-loc">{course.location}</span>
    </div>
  );
}
