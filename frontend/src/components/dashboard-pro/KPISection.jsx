import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  HeartHandshake,
  TimerReset,
  Users,
} from "lucide-react";
import CountUpValue from "./CountUpValue";

const kpiConfig = [
  { key: "totalEncounters", title: "Total Encounters", icon: Users, accent: "#6366f1" },
  { key: "positiveFeedback", title: "Positive Feedback", icon: HeartHandshake, accent: "#10b981" },
  { key: "negativeFeedback", title: "Negative Feedback", icon: AlertTriangle, accent: "#ef4444" },
  { key: "resolvedIssues", title: "Resolved Issues", icon: BadgeCheck, accent: "#8b5cf6" },
  { key: "todaysFeedback", title: "Today's Feedback", icon: CalendarDays, accent: "#f59e0b" },
  { key: "inProgress", title: "In Progress", icon: TimerReset, accent: "#0ea5e9" },
];

function SkeletonCard() {
  return (
    <div className="dashboard-pro-card dashboard-pro-kpi">
      <div className="dashboard-pro-skeleton" style={{ width: 52, height: 52, borderRadius: 18 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 26, width: "56%", height: 14, borderRadius: 999 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 12, width: "40%", height: 32, borderRadius: 999 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 12, width: "84%", height: 12, borderRadius: 999 }} />
    </div>
  );
}

function KpiCard({ item, index, subtitles, values, motionVariants }) {
  const Icon = item.icon;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={motionVariants}
      className="dashboard-pro-card dashboard-pro-kpi"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${item.accent}15`,
            color: item.accent,
          }}
        >
          <Icon size={24} />
        </div>
        <span className="dashboard-pro-badge" style={{ background: "rgba(99,102,241,0.08)", color: "#4f46e5" }}>
          Live
        </span>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 600 }}>{item.title}</div>
        <div style={{ marginTop: 10, fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>
          <CountUpValue value={values[item.key] || 0} />
        </div>
        <div style={{ marginTop: 8, color: "#94a3b8", fontSize: "0.82rem", lineHeight: 1.55 }}>
          {subtitles[item.key]}
        </div>
      </div>
    </motion.div>
  );
}

export default function KPISection({ loading, dashboardValues, subtitles, motionVariants }) {
  return (
    <section className="dashboard-pro-kpis">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
        : kpiConfig.map((item, index) => (
            <KpiCard
              key={item.key}
              item={item}
              index={index}
              subtitles={subtitles}
              values={dashboardValues}
              motionVariants={motionVariants}
            />
          ))}
    </section>
  );
}
