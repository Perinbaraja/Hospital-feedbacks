import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { formatRelativeTime, STATUS_COLORS } from "./dashboardUtils";
import { getAssetUrl } from "../../api";

function FeedbackCard({ item, index, motionVariants }) {
  const sentimentValue = String(item.sentiment || "").trim().toLowerCase();
  const sentimentKey = sentimentValue === "mixed" ? "mixed" : sentimentValue === "negative" ? "negative" : "positive";
  const statusTone = STATUS_COLORS[sentimentKey];
  const imageUrl = getAssetUrl(item.image || item.feedbackImage || item.imageUrl || "");
  const showInProgressBadge = item.status === "IN PROGRESS" && sentimentKey !== "positive";
  const MotionArticle = motion.article;

  return (
    <MotionArticle
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="dashboard-pro-badge" style={{ background: statusTone.background, color: statusTone.color }}>
            {statusTone.label}
          </span>
          {showInProgressBadge && (
            <span className="dashboard-pro-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
              In Progress
            </span>
          )}
        </div>
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

      {imageUrl && (
        <div style={{ margin: '14px auto 0', borderRadius: 16, overflow: 'hidden', maxWidth: 320, width: '100%', height: 140 }}>
          <img
            src={imageUrl}
            alt="Feedback attachment"
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
      )}

      <p className="dashboard-pro-feedback-comment">{item.comment}</p>

      <div className="dashboard-pro-feedback-footer">
        <span className="dashboard-pro-feedback-time">{formatRelativeTime(item.createdAt)}</span>
        {item.status !== "IN PROGRESS" && (
          <span className="dashboard-pro-badge" style={{ background: "#eef6ff", color: "#2563eb" }}>
            {item.status}
          </span>
        )}
      </div>
    </MotionArticle>
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
  const displayedRecords = sortedRecords.slice(0, 5);

  return (
    <section className="dashboard-pro-card dashboard-pro-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Recent Feedback Activity</div>
          {/* <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>
            Modern card view powered by the same filtered dataset as the charts and KPIs
          </div> */}
        </div>
        <span className="dashboard-pro-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
          <Activity size={14} />
          {displayedRecords.length} visible items
        </span>
      </div>

      <div className="dashboard-pro-activity-list">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <FeedbackSkeleton key={index} />)
          : displayedRecords.length > 0
            ? displayedRecords.map((item, index) => (
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
