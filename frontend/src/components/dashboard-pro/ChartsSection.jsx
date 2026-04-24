import { useState } from "react";
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
import { BrainCircuit, CheckCircle2, ClipboardList, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";

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

function AgentListSection({ title, items, renderItem }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
      <div style={{ color: "#0f172a", fontSize: "0.92rem", fontWeight: 900 }}>{title}</div>
      {items.map((item, index) => (
        <div
          key={`${title}-${index}`}
          style={{
            border: "1px solid #e7eef6",
            borderRadius: 16,
            padding: 12,
            background: "#fbfdff",
            color: "#334155",
            fontSize: "0.82rem",
            lineHeight: 1.55,
          }}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

function SentimentInsightSection({ title, tone, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const style = insightToneStyles[tone] || insightToneStyles.warning;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: "#0f172a", fontSize: "0.92rem", fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            style={{
              borderRadius: 16,
              padding: 12,
              ...style,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: "0.86rem" }}>{item.title}</div>
            <div style={{ marginTop: 5, fontSize: "0.82rem", lineHeight: 1.55 }}>{item.body}</div>
            <div style={{ marginTop: 6, fontSize: "0.8rem", lineHeight: 1.5, fontWeight: 800 }}>
              {item.department}: {item.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const agentTabs = [
  { id: "positive", label: "Positive", icon: CheckCircle2 },
  { id: "negative", label: "Negative", icon: TriangleAlert },
  { id: "mixed", label: "Mixed", icon: Sparkles },
  { id: "actions", label: "Actions", icon: ClipboardList },
  { id: "playbook", label: "Playbook", icon: BrainCircuit },
];

export default function ChartsSection({
  trendData,
  radarData,
  sentimentSummary,
  departmentMetrics,
  worstDepartment,
  smartInsights,
  aiInsightsMeta,
  positiveRate,
  rangeLabel,
  motionVariants,
}) {
  const [activeAgentTab, setActiveAgentTab] = useState("positive");

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
            <BrainCircuit size={21} color="#2563eb" />
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>AI Prevention Agent</div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: "0.86rem", lineHeight: 1.5 }}>
                {aiInsightsMeta?.source === "model"
                  ? `${aiInsightsMeta.provider ? `${aiInsightsMeta.provider.toUpperCase()} ` : ""}Model: ${aiInsightsMeta.model || "configured model"}`
                  : aiInsightsMeta?.source === "fallback"
                  ? "Fallback active: add OPENAI_API_KEY for model insights"
                  : aiInsightsMeta?.source === "error-fallback"
                  ? `Model unavailable: ${aiInsightsMeta.error || "showing rich fallback agent output"}`
                  : "Analyzes feedback themes, risk, and department actions"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {smartInsights.map((item, index) => (
              <SmartInsight key={item.id} insight={item} index={index} motionVariants={motionVariants} />
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {agentTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeAgentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveAgentTab(tab.id)}
                  style={{
                    border: active ? "1px solid rgba(37,99,235,0.35)" : "1px solid #dbe5f0",
                    background: active ? "#eff6ff" : "#fff",
                    color: active ? "#1d4ed8" : "#475569",
                    borderRadius: 12,
                    padding: "8px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 900,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeAgentTab === "positive" ? (
          <SentimentInsightSection
            title="AI Positive Insights"
            tone="success"
            items={aiInsightsMeta?.positiveInsights}
          />
          ) : null}

          {activeAgentTab === "negative" ? (
          <SentimentInsightSection
            title="AI Negative Insights"
            tone="danger"
            items={aiInsightsMeta?.negativeInsights}
          />
          ) : null}

          {activeAgentTab === "mixed" ? (
          <SentimentInsightSection
            title="AI Mixed Insights"
            tone="warning"
            items={aiInsightsMeta?.mixedInsights}
          />
          ) : null}

          {activeAgentTab === "actions" ? (
          <>
          <AgentListSection
            title="Priority Actions"
            items={aiInsightsMeta?.priorityActions}
            renderItem={(item) => (
              <>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>{item.priority} · {item.department}</div>
                <div style={{ marginTop: 4 }}>{item.action}</div>
                <div style={{ marginTop: 4, color: "#64748b" }}>{item.owner} · {item.timeframe}</div>
              </>
            )}
          />

          <AgentListSection
            title="Prevention Checklist"
            items={aiInsightsMeta?.preventionChecklist}
            renderItem={(item) => <div>{item}</div>}
          />
          </>
          ) : null}

          {activeAgentTab === "playbook" ? (
          <>
          <AgentListSection
            title="Department Playbook"
            items={aiInsightsMeta?.departmentPlaybook}
            renderItem={(item) => (
              <>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>{item.department}</div>
                <div style={{ marginTop: 4 }}>{item.riskReason}</div>
                <div style={{ marginTop: 4, color: "#475569", fontWeight: 800 }}>{item.dailyHuddleTopic}</div>
                <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                  {(item.preventionSteps || []).map((step, stepIndex) => (
                    <div key={stepIndex}>- {step}</div>
                  ))}
                </div>
              </>
            )}
          />

          <AgentListSection
            title="Follow-up Questions"
            items={aiInsightsMeta?.followUpQuestions}
            renderItem={(item) => <div>{item}</div>}
          />

          <AgentListSection
            title="Patient Message Drafts"
            items={aiInsightsMeta?.patientMessageDrafts}
            renderItem={(item) => (
              <>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>{item.scenario}</div>
                <div style={{ marginTop: 4 }}>{item.message}</div>
              </>
            )}
          />
          </>
          ) : null}
        </MotionDiv>
      </section>
    </>
  );
}
