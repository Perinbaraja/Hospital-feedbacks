import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchAdminDashboard } from "../../services/adminDashboardCache";
import FilterBar from "./FilterBar";
import KPISection from "./KPISection";
import ChartsSection from "./ChartsSection";
import FeedbackCardList from "./FeedbackCardList";
import { dummyComparisonRecords, dummyDashboardRecords } from "./mockDashboardData";
import {
  deriveDashboardState,
  formatDateInput,
  getDateRangeFromPreset,
  matchesDashboardFilters,
} from "./dashboardUtils";
import "./HospitalAdminDashboard.css";

const emptyDashboard = {
  feedbackRecords: [],
  comparisonRecords: [],
  lastUpdated: new Date().toISOString(),
};

const defaultFilters = {
  searchTerm: "",
  department: "All",
  datePreset: "last7Days",
  fromDate: "",
  toDate: "",
};

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

const formatTrendText = (value) => {
  if (!value) return "Stable vs previous window";
  return `${value > 0 ? "+" : ""}${value}% vs previous window`;
};

export default function HospitalAdminDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryHospitalId = searchParams.get("hospitalId");
  const hospitalId = queryHospitalId || user?.hospitalId || user?.hospital?._id || "";

  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [filters, setFilters] = useState(defaultFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const dateRange = useMemo(() => {
    const fromDate = debouncedFilters.fromDate ? new Date(`${debouncedFilters.fromDate}T00:00:00`) : null;
    const toDate = debouncedFilters.toDate ? new Date(`${debouncedFilters.toDate}T23:59:59.999`) : null;
    return getDateRangeFromPreset(debouncedFilters.datePreset, fromDate, toDate);
  }, [debouncedFilters.datePreset, debouncedFilters.fromDate, debouncedFilters.toDate]);

  const loadDashboard = useCallback(async ({ forceRefresh = false, showSkeleton = false } = {}) => {
    try {
      setError("");
      if (showSkeleton) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await fetchAdminDashboard(
        {
          ...(hospitalId ? { hospitalId } : {}),
          fromDate: dateRange.currentStart.toISOString(),
          toDate: dateRange.currentEnd.toISOString(),
          range: dateRange.preset,
        },
        {
          forceRefresh,
          ttlMs: forceRefresh ? 3000 : 15000,
        }
      );

      setDashboard({
        feedbackRecords: data.feedbackRecords || [],
        comparisonRecords: data.comparisonRecords || [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    } catch (fetchError) {
      console.error("Dashboard fetch failed:", fetchError);
      setError("Live dashboard data is unavailable. Showing dummy test data.");
      setDashboard({
        feedbackRecords: dummyDashboardRecords,
        comparisonRecords: dummyComparisonRecords,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.currentEnd, dateRange.currentStart, dateRange.preset, hospitalId]);

  useEffect(() => {
    loadDashboard({ showSkeleton: true });

    const intervalId = window.setInterval(() => {
      loadDashboard({ forceRefresh: true });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const departmentOptions = useMemo(() => {
    return [...new Set([...dashboard.feedbackRecords, ...dashboard.comparisonRecords].map((item) => item.service).filter(Boolean))].sort();
  }, [dashboard.comparisonRecords, dashboard.feedbackRecords]);

  const filteredCurrentRecords = useMemo(() => {
    return dashboard.feedbackRecords.filter((record) =>
      matchesDashboardFilters(record, debouncedFilters.searchTerm, debouncedFilters.department)
    );
  }, [dashboard.feedbackRecords, debouncedFilters.department, debouncedFilters.searchTerm]);

  const filteredComparisonRecords = useMemo(() => {
    return dashboard.comparisonRecords.filter((record) =>
      matchesDashboardFilters(record, debouncedFilters.searchTerm, debouncedFilters.department)
    );
  }, [dashboard.comparisonRecords, debouncedFilters.department, debouncedFilters.searchTerm]);

  const dashboardState = useMemo(() => {
    return deriveDashboardState({
      currentRecords: filteredCurrentRecords,
      comparisonRecords: filteredComparisonRecords,
      dateRange,
    });
  }, [dateRange, filteredComparisonRecords, filteredCurrentRecords]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => {
      const nextState = { ...current, [key]: value };
      if (key === "datePreset" && value === "custom" && !current.fromDate && !current.toDate) {
        const today = formatDateInput(new Date());
        nextState.fromDate = today;
        nextState.toDate = today;
      }
      if (key === "datePreset" && value !== "custom") {
        nextState.fromDate = "";
        nextState.toDate = "";
      }
      return nextState;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const handleExportCsv = useCallback(() => {
    const rows = filteredCurrentRecords;
    if (!rows.length) return;

    const csvLines = [
      ["Feedback ID", "Patient Name", "Patient Email", "Service", "Sentiment", "Positive Tags", "Negative Tags", "Status", "Comment", "Created At"].join(","),
      ...rows.map((item) => [
        item.id,
        item.patientName,
        item.patientEmail,
        item.service,
        item.sentimentLabel,
        `"${(item.positiveTags || []).join("; ").replace(/"/g, '""')}"`,
        `"${(item.negativeTags || []).join("; ").replace(/"/g, '""')}"`,
        item.status,
        `"${String(item.comment || "").replace(/"/g, '""')}"`,
        item.createdAt,
      ].join(",")),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hospital-dashboard-${formatDateInput(dateRange.currentStart)}-${formatDateInput(dateRange.currentEnd)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [dateRange.currentEnd, dateRange.currentStart, filteredCurrentRecords]);

  const liveTimestamp = dashboard.lastUpdated
    ? new Date(dashboard.lastUpdated).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  return (
    <div className="dashboard-pro-shell">
      <div className="dashboard-pro-frame">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="dashboard-pro-card dashboard-pro-hero"
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="dashboard-pro-live">
              <span className="dashboard-pro-live-dot" />
              Live Feedback Monitoring
            </div>
            <h1 style={{ marginTop: 18, fontSize: "clamp(2rem, 3vw, 3.4rem)", lineHeight: 1.05, color: "#0f172a" }}>
              Hospital Feedback
              <span style={{ display: "block", background: "linear-gradient(90deg,#10b981,#3b82f6,#8b5cf6)", WebkitBackgroundClip: "text", color: "transparent" }}>
                Performance Dashboard
              </span>
            </h1>
            <p style={{ marginTop: 16, maxWidth: 700, color: "#64748b", fontSize: "1.02rem", lineHeight: 1.75 }}>
              Shared filtered analytics for hospital sentiment, complaint flow, department performance, and live recent feedback activity.
            </p>
            {error ? (
              <div style={{ marginTop: 14, color: "#b91c1c", fontWeight: 700, fontSize: "0.9rem" }}>{error}</div>
            ) : null}
          </div>

          <div style={{ minWidth: 260, display: "grid", gap: 14, position: "relative", zIndex: 1 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 24,
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))",
                border: "1px solid rgba(16,185,129,0.14)",
              }}
            >
              <div style={{ color: "#64748b", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Last Updated
              </div>
              <div style={{ marginTop: 8, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                {liveTimestamp}
              </div>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>
                {formatTrendText(dashboardState.weeklyTrendPercent)}
              </div>
            </div>

            <button className="dashboard-pro-button dashboard-pro-button-primary" onClick={() => loadDashboard({ forceRefresh: true })}>
              <RefreshCw size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
              {refreshing ? "Refreshing..." : "Refresh Now"}
            </button>
          </div>
        </motion.section>

        <FilterBar
          filters={filters}
          departmentOptions={departmentOptions}
          onChange={handleFilterChange}
          onExport={handleExportCsv}
          onReset={handleResetFilters}
        />

        <KPISection
          loading={loading}
          dashboardValues={dashboardState.dashboardValues}
          subtitles={dashboardState.subtitles}
          motionVariants={cardMotion}
        />

        <ChartsSection
          trendData={dashboardState.trendData}
          radarData={dashboardState.radarData}
          sentimentSummary={dashboardState.sentimentSummary}
          departmentMetrics={dashboardState.departmentMetrics}
          worstDepartment={dashboardState.worstDepartment}
          smartInsights={dashboardState.smartInsights}
          positiveRate={dashboardState.positiveRate}
          rangeLabel={dateRange.label}
          motionVariants={cardMotion}
        />

        <FeedbackCardList
          records={filteredCurrentRecords}
          loading={loading}
          motionVariants={cardMotion}
        />
      </div>
    </div>
  );
}
