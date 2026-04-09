import { motion as Motion } from "framer-motion";
const MotionDiv = Motion.div;
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
    <MotionDiv
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
    </MotionDiv>
  );
}

export default function ChartsSection({
  trendData,
  radarData,
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
        <div className="dashboard-pro-card dashboard-pro-section">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Daily Sentiment Trend</div>
              <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>Daily counts for positive, mixed, and negative feedback</div>
            </div>
            <span className="dashboard-pro-badge" style={{ background: "#eef6ff", color: "#2563eb" }}>
              <TrendingUp size={14} />
              {rangeLabel}
            </span>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, angle: -45, textAnchor: "end", dy: 15 }}
                  tickMargin={10}
                  minTickGap={25}
                  height={60}
                  padding={{ left: 12, right: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="positive" name="Positive" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="mixed" name="Mixed" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="negative" name="Negative" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <MotionDiv
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
        </MotionDiv>
      </section>

      <section className="dashboard-pro-card dashboard-pro-section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Daily Sentiment Composition</div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>Radar view of daily sentiment distribution across the current period</div>
          </div>
          <span className="dashboard-pro-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>
            {rangeLabel}
          </span>
        </div>

        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData} outerRadius="85%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <PolarGrid stroke="#e8eef6" />
              <PolarAngleAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, "dataMax"]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip />
              <Radar name="Positive" dataKey="positive" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              <Radar name="Mixed" dataKey="mixed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
              <Radar name="Negative" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-pro-subgrid">
        <div className="dashboard-pro-card dashboard-pro-section">
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
              <BarChart data={departmentMetrics} barCategoryGap={22} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                <Bar dataKey="positiveVisual" name="Positive" stackId="sentiment" fill="#10b981" radius={[0, 0, 12, 12]} />
                <Bar dataKey="mixedVisual" name="Mixed" stackId="sentiment" fill="#f59e0b" />
                <Bar dataKey="negativeVisual" name="Negative" stackId="sentiment" fill="#ef4444" radius={[12, 12, 0, 0]} />
                <Line type="monotone" dataKey="feedbackCount" name="Feedback volume" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <MotionDiv
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
        </MotionDiv>
      </section>
    </>
  );
}
