import { CalendarDays, Download, RotateCcw, Search } from "lucide-react";
import { DATE_PRESET_OPTIONS } from "./dashboardUtils";

export default function FilterBar({
  filters,
  departmentOptions,
  onChange,
  onExport,
  onReset,
}) {
  return (
    <section className="dashboard-pro-searchbar dashboard-pro-card dashboard-pro-filterbar">
      <label className="dashboard-pro-searchfield">
        <Search size={18} className="dashboard-pro-search-icon" />
        <input
          className="dashboard-pro-input"
          value={filters.searchTerm}
          onChange={(event) => onChange("searchTerm", event.target.value)}
          placeholder="Search feedback, patient, service, tags, or comment"
        />
      </label>

      <select
        className="dashboard-pro-select"
        value={filters.department}
        onChange={(event) => onChange("department", event.target.value)}
      >
        <option value="All">All departments</option>
        {departmentOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        className="dashboard-pro-select"
        value={filters.datePreset}
        onChange={(event) => onChange("datePreset", event.target.value)}
      >
        {DATE_PRESET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {filters.datePreset === "custom" ? (
        <div className="dashboard-pro-custom-range">
          <label className="dashboard-pro-datefield">
            <CalendarDays size={16} />
            <input
              className="dashboard-pro-input"
              type="date"
              value={filters.fromDate}
              onChange={(event) => onChange("fromDate", event.target.value)}
            />
          </label>
          <label className="dashboard-pro-datefield">
            <CalendarDays size={16} />
            <input
              className="dashboard-pro-input"
              type="date"
              value={filters.toDate}
              onChange={(event) => onChange("toDate", event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="dashboard-pro-filter-hint">
          Dashboard uses one shared filtered dataset for KPIs, charts, and cards.
        </div>
      )}

      <div className="dashboard-pro-filter-actions">
        <button className="dashboard-pro-button dashboard-pro-button-ghost" onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>

        <button className="dashboard-pro-button dashboard-pro-button-ghost" onClick={onExport}>
          <Download size={16} />
          Export CSV
        </button>
      </div>
    </section>
  );
}
