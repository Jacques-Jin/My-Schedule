interface FilterChipsProps {
  filter: string;
  onFilterChange: (f: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  categories: string[];
}

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "undone", label: "未完" },
  { key: "overdue", label: "已逾期" },
  { key: "done", label: "已完成" },
];

export default function FilterChips({ filter, onFilterChange, category, onCategoryChange, search, onSearchChange, categories }: FilterChipsProps) {
  return (
    <div className="task-filters">
      <div className="filter-chips">
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-chip ${filter === f.key ? "active" : ""}`} onClick={() => onFilterChange(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="filter-row2">
        <select className="filter-category" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="filter-search" type="text" placeholder="搜索日程…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </div>
    </div>
  );
}
