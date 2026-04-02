import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { formatRelativeTime, STATUS_COLORS } from "./dashboardUtils";

function FeedbackCard({ item, index, motionVariants }) {
  const sentimentKey = item.sentiment === "mixed" ? "mixed" : item.sentiment === "negative" ? "negative" : "positive";
  const statusTone = STATUS_COLORS[sentimentKey];

  return (
    <motion.article
      custom={index}
      initial="hidden"
      animate="visible"
      variants={motionVariants}
      className="dashboard-pro-feedback-card dashboard-pro-feedback-card-hover"
    >
      <div className="dashboard-pro-feedback-header">
        <div className="dashboard-pro-feedback-main">
          <div className="dashboard-pro-feedback-id">{item.id}</div>
          <div className="dashboard-pro-feedback-name">{item.patientName}</div>
          <div className="dashboard-pro-feedback-meta">{item.service} | {item.patientEmail}</div>
        </div>
        <span className="dashboard-pro-badge" style={{ background: statusTone.background, color: statusTone.color }}>
          {statusTone.label}
        </span>
      </div>

      <div className="dashboard-pro-feedback-chip-row">
        {(item.positiveTags || []).map((tag) => (
          <span key={`${item.id}-positive-${tag}`} className="dashboard-pro-feedback-chip dashboard-pro-feedback-chip-positive">
            {tag}
          </span>
        ))}
        {(item.negativeTags || []).map((tag) => (
          <span key={`${item.id}-negative-${tag}`} className="dashboard-pro-feedback-chip dashboard-pro-feedback-chip-negative">
            {tag}
          </span>
        ))}
      </div>

      <p className="dashboard-pro-feedback-comment">{item.comment}</p>

      <div className="dashboard-pro-feedback-footer">
        <span className="dashboard-pro-feedback-time">{formatRelativeTime(item.createdAt)}</span>
        <span className="dashboard-pro-badge" style={{ background: "#eef6ff", color: "#2563eb" }}>
          {item.status}
        </span>
      </div>
    </motion.article>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="dashboard-pro-feedback-card">
      <div className="dashboard-pro-skeleton" style={{ width: "28%", height: 12, borderRadius: 999 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 12, width: "22%", height: 18, borderRadius: 999 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 12, width: "48%", height: 12, borderRadius: 999 }} />
      <div className="dashboard-pro-skeleton" style={{ marginTop: 16, width: "100%", height: 44, borderRadius: 18 }} />
    </div>
  );
}

export default function FeedbackCardList({ records, loading, motionVariants }) {
  const sortedRecords = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="dashboard-pro-card dashboard-pro-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Recent Feedback Activity</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>
            Modern card view powered by the same filtered dataset as the charts and KPIs
          </div>
        </div>
        <span className="dashboard-pro-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
          <Activity size={14} />
          {sortedRecords.length} visible items
        </span>
      </div>

      <div className="dashboard-pro-activity-list">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <FeedbackSkeleton key={index} />)
          : sortedRecords.length > 0
            ? sortedRecords.map((item, index) => (
                <FeedbackCard key={item.id} item={item} index={index} motionVariants={motionVariants} />
              ))
            : (
                <div className="dashboard-pro-empty-state">
                  <div className="dashboard-pro-empty-title">No feedback found</div>
                  <div className="dashboard-pro-empty-copy">
                    Try resetting filters or widening the selected date range to see more hospital feedback.
                  </div>
                </div>
              )}
      </div>
    </section>
  );
}
