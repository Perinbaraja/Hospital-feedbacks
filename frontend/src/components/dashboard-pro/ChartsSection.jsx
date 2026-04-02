import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";

const insightToneStyles = {
  success: {
    background: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.18)",
    color: "#065f46",
  },
  warning: {
    background: "rgba(245, 158, 11, 0.09)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    color: "#92400e",
  },
  danger: {
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.18)",
    color: "#991b1b",
  },
};

function SmartInsight({ insight, index, motionVariants }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={motionVariants}
      style={{
        borderRadius: 20,
        padding: 18,
        ...(insightToneStyles[insight.tone] || insightToneStyles.warning),
      }}
    >
      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{insight.title}</div>
      <div style={{ marginTop: 8, lineHeight: 1.6, fontSize: "0.85rem" }}>{insight.body}</div>
    </motion.div>
  );
}

export default function ChartsSection({
  trendData,
  sentimentSummary,
  departmentMetrics,
  worstDepartment,
  smartInsights,
  positiveRate,
  rangeLabel,
  motionVariants,
}) {
  return (
    <>
      <section className="dashboard-pro-grid">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionVariants}
          className="dashboard-pro-card dashboard-pro-section"
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Daily Feedback Trend</div>
              <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>Live submissions compared to the filtered period average</div>
            </div>
            <span className="dashboard-pro-badge" style={{ background: "#eef6ff", color: "#2563eb" }}>
              <TrendingUp size={14} />
              {rangeLabel}
            </span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="daily" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="weekly" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="7 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionVariants}
          custom={1}
          className="dashboard-pro-card dashboard-pro-section"
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Sentiment Mix</div>
              <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>Positive, negative, and mixed response distribution</div>
            </div>
            <span className="dashboard-pro-badge" style={{ background: "#ecfdf5", color: "#047857" }}>
              <Sparkles size={14} />
              {positiveRate}% positive
            </span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sentimentSummary} innerRadius={72} outerRadius={112} dataKey="count" paddingAngle={4}>
                  {sentimentSummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {sentimentSummary.map((entry) => (
              <div key={entry.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: entry.fill }} />
                  <span style={{ color: "#475569", fontWeight: 700 }}>{entry.name}</span>
                </div>
                <span style={{ color: "#0f172a", fontWeight: 800 }}>{entry.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="dashboard-pro-subgrid">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionVariants}
          className="dashboard-pro-card dashboard-pro-section"
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Department Insights</div>
              <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>Positive, mixed, and negative split by service</div>
            </div>
            <span className="dashboard-pro-badge" style={{ background: "rgba(239,68,68,0.08)", color: "#b91c1c" }}>
              Worst: {worstDepartment?.name || "N/A"}
            </span>
          </div>

          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={departmentMetrics} barCategoryGap={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    if (!item) return label;
                    return `${label}: ${item.feedbackCount} total, ${item.positiveCount} positive, ${item.mixedCount} mixed, ${item.negativeCount} negative`;
                  }}
                />
                <Legend />
                <Bar dataKey="positiveVisual" name="Positive share" stackId="sentiment" fill="#10b981" radius={[0, 0, 12, 12]} />
                <Bar dataKey="mixedVisual" name="Mixed share" stackId="sentiment" fill="#f59e0b" />
                <Bar dataKey="negativeVisual" name="Negative share" stackId="sentiment" fill="#ef4444" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionVariants}
          custom={1}
          className="dashboard-pro-card dashboard-pro-section"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Sparkles size={20} color="#8b5cf6" />
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Smart Insights</div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {smartInsights.map((item, index) => (
              <SmartInsight key={item.id} insight={item} index={index} motionVariants={motionVariants} />
            ))}
          </div>
        </motion.div>
      </section>
    </>
  );
}
