import crypto from "crypto";

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const modelCache = new Map();
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];
const EXCLUDED_GEMINI_MODEL_PATTERNS = [
  "tts",
  "image",
  "embedding",
  "aqa",
];
const geminiModelListCache = {
  expiresAt: 0,
  models: [],
};

const INSIGHT_SCHEMA = {
  type: "json_schema",
  name: "hospital_feedback_ai_insights",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "riskLevel", "insights", "positiveInsights", "negativeInsights", "mixedInsights", "priorityActions", "departmentPlaybook", "preventionChecklist", "followUpQuestions", "patientMessageDrafts"],
    properties: {
      summary: {
        type: "string",
        description: "One concise executive summary of what the department leaders should know.",
      },
      riskLevel: {
        type: "string",
        enum: ["Low", "Moderate", "High"],
      },
      insights: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "tone", "title", "body", "department", "action"],
          properties: {
            id: { type: "string" },
            tone: { type: "string", enum: ["success", "warning", "danger"] },
            title: { type: "string" },
            body: { type: "string" },
            department: { type: "string" },
            action: { type: "string" },
          },
        },
      },
      positiveInsights: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "body", "department", "recommendation"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            department: { type: "string" },
            recommendation: { type: "string" },
          },
        },
      },
      negativeInsights: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "body", "department", "recommendation"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            department: { type: "string" },
            recommendation: { type: "string" },
          },
        },
      },
      mixedInsights: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "body", "department", "recommendation"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            department: { type: "string" },
            recommendation: { type: "string" },
          },
        },
      },
      priorityActions: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["priority", "department", "action", "why", "owner", "timeframe"],
          properties: {
            priority: { type: "string", enum: ["High", "Medium", "Low"] },
            department: { type: "string" },
            action: { type: "string" },
            why: { type: "string" },
            owner: { type: "string" },
            timeframe: { type: "string" },
          },
        },
      },
      departmentPlaybook: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["department", "riskReason", "dailyHuddleTopic", "preventionSteps"],
          properties: {
            department: { type: "string" },
            riskReason: { type: "string" },
            dailyHuddleTopic: { type: "string" },
            preventionSteps: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string" },
            },
          },
        },
      },
      preventionChecklist: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: { type: "string" },
      },
      followUpQuestions: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string" },
      },
      patientMessageDrafts: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["scenario", "message"],
          properties: {
            scenario: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  },
};

const sanitizeText = (value, maxLength = 280) => String(value || "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const getAiProvider = () => {
  const configuredProvider = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (configuredProvider) return configuredProvider;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "fallback";
};

const getConfiguredModel = (provider) => {
  if (provider === "gemini") return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (provider === "openai") return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  return null;
};

const compactRecord = (record = {}) => ({
  id: sanitizeText(record.id, 40),
  department: sanitizeText(record.service || "General", 80),
  sentiment: sanitizeText(record.sentimentLabel || record.sentiment || "Unknown", 30),
  status: sanitizeText(record.status || "Pending", 30),
  comment: sanitizeText(record.comment, 260),
  positiveTags: (record.positiveTags || []).slice(0, 5).map((item) => sanitizeText(item, 80)),
  negativeTags: (record.negativeTags || []).slice(0, 5).map((item) => sanitizeText(item, 80)),
  createdAt: record.createdAt,
});

const buildAgentInput = ({ records, comparisonRecords, metrics, rangeLabel, filterContext = {} }) => {
  const recentRecords = [...records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40)
    .map(compactRecord);

  const previousNegativeCount = comparisonRecords.filter((record) => record.sentimentLabel === "Negative").length;

  return {
    rangeLabel,
    filterContext,
    metrics: {
      totalFeedback: metrics.totalFeedback,
      positiveRate: metrics.positiveRate,
      negativeCount: metrics.negativeCount,
      mixedCount: metrics.mixedCount,
      completionRate: metrics.completionRate,
      overduePendingCount: metrics.overduePendingCount,
      previousNegativeCount,
    },
    departmentMetrics: (metrics.departmentMetrics || []).slice(0, 12),
    feedback: recentRecords,
  };
};

const extractOutputText = (data = {}) => {
  if (typeof data.output_text === "string") return data.output_text;

  const message = (data.output || []).find((item) => item.type === "message");
  const textItem = (message?.content || []).find((item) => item.type === "output_text");
  return textItem?.text || "";
};

const extractGeminiText = (data = {}) => {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
};

const stripJsonCodeFence = (value) => String(value || "")
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/i, "")
  .trim();

const getGeminiHeaders = () => ({
  "Content-Type": "application/json",
  "x-goog-api-key": process.env.GEMINI_API_KEY,
});

const listAvailableGeminiModels = async () => {
  if (geminiModelListCache.expiresAt > Date.now()) {
    return geminiModelListCache.models;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    method: "GET",
    headers: getGeminiHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini model list failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const models = (data.models || [])
    .filter((item) => (item.supportedGenerationMethods || []).includes("generateContent"))
    .map((item) => String(item.name || "").replace(/^models\//, ""))
    .filter(Boolean);

  geminiModelListCache.models = models;
  geminiModelListCache.expiresAt = Date.now() + 30 * 60 * 1000;
  return models;
};

const getGeminiCandidateModels = async (configuredModel) => {
  const normalizedModel = String(configuredModel || DEFAULT_GEMINI_MODEL).replace(/^models\//, "");
  const listedModels = await listAvailableGeminiModels();
  const textModels = listedModels.filter((model) => {
    const lowered = model.toLowerCase();
    return !EXCLUDED_GEMINI_MODEL_PATTERNS.some((pattern) => lowered.includes(pattern));
  });
  const preferredListedModels = [
    normalizedModel,
    ...GEMINI_MODEL_FALLBACKS,
    ...textModels.filter((model) => model.toLowerCase().includes("flash")),
    ...textModels,
  ];

  return [...new Set(preferredListedModels)].filter((model) => textModels.includes(model));
};

const normalizeAgentInsights = (parsed = {}) => {
  const insights = Array.isArray(parsed.insights) ? parsed.insights : [];
  const positiveInsights = Array.isArray(parsed.positiveInsights) ? parsed.positiveInsights : [];
  const negativeInsights = Array.isArray(parsed.negativeInsights) ? parsed.negativeInsights : [];
  const mixedInsights = Array.isArray(parsed.mixedInsights) ? parsed.mixedInsights : [];
  const priorityActions = Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [];
  const departmentPlaybook = Array.isArray(parsed.departmentPlaybook) ? parsed.departmentPlaybook : [];
  const preventionChecklist = Array.isArray(parsed.preventionChecklist) ? parsed.preventionChecklist : [];
  const followUpQuestions = Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [];
  const patientMessageDrafts = Array.isArray(parsed.patientMessageDrafts) ? parsed.patientMessageDrafts : [];

  return {
    source: "model",
    provider: parsed.provider || getAiProvider(),
    model: parsed.model || getConfiguredModel(getAiProvider()),
    generatedAt: new Date().toISOString(),
    summary: sanitizeText(parsed.summary, 500),
    riskLevel: ["Low", "Moderate", "High"].includes(parsed.riskLevel) ? parsed.riskLevel : "Moderate",
    insights: insights.slice(0, 5).map((item, index) => ({
      id: sanitizeText(item.id || `ai-insight-${index + 1}`, 80),
      tone: ["success", "warning", "danger"].includes(item.tone) ? item.tone : "warning",
      title: sanitizeText(item.title, 120),
      body: sanitizeText(item.body, 500),
      department: sanitizeText(item.department || "All departments", 100),
      action: sanitizeText(item.action, 300),
    })),
    positiveInsights: positiveInsights.slice(0, 4).map((item) => ({
      title: sanitizeText(item.title, 140),
      body: sanitizeText(item.body, 360),
      department: sanitizeText(item.department || "All departments", 100),
      recommendation: sanitizeText(item.recommendation, 280),
    })),
    negativeInsights: negativeInsights.slice(0, 4).map((item) => ({
      title: sanitizeText(item.title, 140),
      body: sanitizeText(item.body, 360),
      department: sanitizeText(item.department || "All departments", 100),
      recommendation: sanitizeText(item.recommendation, 280),
    })),
    mixedInsights: mixedInsights.slice(0, 4).map((item) => ({
      title: sanitizeText(item.title, 140),
      body: sanitizeText(item.body, 360),
      department: sanitizeText(item.department || "All departments", 100),
      recommendation: sanitizeText(item.recommendation, 280),
    })),
    priorityActions: priorityActions.slice(0, 5).map((item) => ({
      priority: ["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium",
      department: sanitizeText(item.department || "All departments", 100),
      action: sanitizeText(item.action, 260),
      why: sanitizeText(item.why, 280),
      owner: sanitizeText(item.owner || "Department owner", 100),
      timeframe: sanitizeText(item.timeframe || "Today", 80),
    })),
    departmentPlaybook: departmentPlaybook.slice(0, 4).map((item) => ({
      department: sanitizeText(item.department || "All departments", 100),
      riskReason: sanitizeText(item.riskReason, 260),
      dailyHuddleTopic: sanitizeText(item.dailyHuddleTopic, 180),
      preventionSteps: (item.preventionSteps || []).slice(0, 4).map((step) => sanitizeText(step, 180)),
    })),
    preventionChecklist: preventionChecklist.slice(0, 8).map((item) => sanitizeText(item, 180)),
    followUpQuestions: followUpQuestions.slice(0, 6).map((item) => sanitizeText(item, 180)),
    patientMessageDrafts: patientMessageDrafts.slice(0, 3).map((item) => ({
      scenario: sanitizeText(item.scenario, 120),
      message: sanitizeText(item.message, 360),
    })),
  };
};

const buildAgentPrompt = (payload) => [
  "You are a senior hospital operations and maintenance advisor.",
  "Analyze patient feedback and produce professional, admin-facing recommendations that improve maintenance quality, service reliability, and patient experience.",
  "Write in polished management language. Be specific, practical, and respectful.",
  "Avoid vague phrases like 'needs focus' or raw labels like 'service failure'.",
  "Prioritize patient safety, cleanliness, facility upkeep, empathy, fast closure, and operational prevention.",
  "Every action should be usable by hospital administrators in a daily review meeting.",
  "For maintenance/facility issues, recommend inspection cadence, owner, escalation path, service standard, and follow-up check.",
  "For canteen/food issues, recommend hygiene checks, wait-time monitoring, vendor/service review, and patient feedback follow-up.",
  "Do not invent facts outside the provided data.",
  "Return ONLY valid JSON. Do not wrap it in markdown.",
  "The JSON must match this shape:",
  JSON.stringify({
    summary: "string",
    riskLevel: "Low | Moderate | High",
    insights: [{ id: "string", tone: "success | warning | danger", title: "string", body: "string", department: "string", action: "string" }],
    positiveInsights: [{ title: "string", body: "string", department: "string", recommendation: "string" }],
    negativeInsights: [{ title: "string", body: "string", department: "string", recommendation: "string" }],
    mixedInsights: [{ title: "string", body: "string", department: "string", recommendation: "string" }],
    priorityActions: [{ priority: "High | Medium | Low", department: "string", action: "string", why: "string", owner: "string", timeframe: "string" }],
    departmentPlaybook: [{ department: "string", riskReason: "string", dailyHuddleTopic: "string", preventionSteps: ["string"] }],
    preventionChecklist: ["string"],
    followUpQuestions: ["string"],
    patientMessageDrafts: [{ scenario: "string", message: "string" }],
  }),
  "Hospital feedback data:",
  JSON.stringify(payload),
  "Quality requirements:",
  "- insight titles should sound professional and board-ready.",
  "- insight body should explain the observed issue and why it matters.",
  "- include positiveInsights for strengths admins should preserve, repeat, or recognize.",
  "- include negativeInsights for risks admins should correct or prevent.",
  "- include mixedInsights for ambiguous feedback where part of the service worked and part needs attention.",
  "- if one sentiment has no matching records, still return one honest item saying there is not enough signal and what data to collect next.",
  "- action fields must be direct recommendations to admin, not generic statements.",
  "- priorityActions should include owner and timeframe.",
  "- departmentPlaybook should include measurable maintenance/service steps.",
  "- patientMessageDrafts should be empathetic and ready to send after admin review.",
].join("\n");

const callGeminiInsights = async ({ model, payload }) => {
  const candidateModels = await getGeminiCandidateModels(model);
  let lastErrorText = "";

  if (candidateModels.length === 0) {
    throw new Error("Gemini insight request failed: no available Gemini model supports generateContent for this API key");
  }

  for (const candidateModel of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: getGeminiHeaders(),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildAgentPrompt(payload) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastErrorText = `${response.status} ${errorText.slice(0, 300)}`;
      const nonTextModelError = response.status === 400 && /response modalities|AUDIO|TEXT is not supported/i.test(errorText);
      if (nonTextModelError) {
        continue;
      }
      if ([404, 429, 503].includes(response.status)) {
        continue;
      }
      throw new Error(`Gemini insight request failed: ${lastErrorText}`);
    }

    const data = await response.json();
    const outputText = stripJsonCodeFence(extractGeminiText(data));
    const parsed = JSON.parse(outputText);
    return normalizeAgentInsights({ ...parsed, provider: "gemini", model: candidateModel });
  }

  throw new Error(`Gemini insight request failed: ${lastErrorText || "No configured Gemini model was available"}`);
};

const callOpenAiInsights = async ({ model, payload }) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "You are a hospital feedback prevention agent. Analyze patient feedback and produce practical, department-level actions to reduce negative feedback. Prioritize patient safety, empathy, fast closure, and operational prevention. Do not invent facts outside the provided data.",
        },
        {
          role: "user",
          content: `Analyze this hospital feedback data and return structured insights only:\n${JSON.stringify(payload)}`,
        },
      ],
      text: {
        format: INSIGHT_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI insight request failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const outputText = extractOutputText(data);
  const parsed = JSON.parse(outputText);
  return normalizeAgentInsights({ ...parsed, provider: "openai", model });
};

export const buildFallbackInsights = ({ records, comparisonRecords, metrics, rangeLabel }) => {
  const negativeCount = metrics.negativeCount || 0;
  const totalFeedback = metrics.totalFeedback || records.length;
  const negativeRate = totalFeedback ? Math.round((negativeCount / totalFeedback) * 100) : 0;
  const previousNegativeCount = comparisonRecords.filter((record) => record.sentimentLabel === "Negative").length;
  const negativeTrend = previousNegativeCount === 0
    ? (negativeCount > 0 ? 100 : 0)
    : Math.round(((negativeCount - previousNegativeCount) / previousNegativeCount) * 100);
  const worstDepartment = [...(metrics.departmentMetrics || [])]
    .sort((a, b) => (a.satisfaction || 0) - (b.satisfaction || 0) || (b.feedbackCount || 0) - (a.feedbackCount || 0))[0];
  const bestDepartment = [...(metrics.departmentMetrics || [])]
    .sort((a, b) => (b.satisfaction || 0) - (a.satisfaction || 0) || (b.feedbackCount || 0) - (a.feedbackCount || 0))[0];
  const mixedDepartment = [...(metrics.departmentMetrics || [])]
    .sort((a, b) => (b.mixedCount || 0) - (a.mixedCount || 0) || (b.feedbackCount || 0) - (a.feedbackCount || 0))[0];
  const riskLevel = negativeRate >= 35 || metrics.overduePendingCount > 2 ? "High" : negativeRate >= 15 ? "Moderate" : "Low";
  const tone = riskLevel === "High" ? "danger" : riskLevel === "Moderate" ? "warning" : "success";

  return {
    source: "fallback",
    model: null,
    generatedAt: new Date().toISOString(),
    summary: `Model key is not configured. Rule-based fallback found ${negativeRate}% negative feedback in ${rangeLabel}.`,
    riskLevel,
    insights: [
      {
        id: "fallback-risk",
        tone,
        title: `${riskLevel} patient experience risk detected`,
        body: `${negativeRate}% of feedback is negative, with negative volume ${Math.abs(negativeTrend)}% ${negativeTrend >= 0 ? "higher" : "lower"} than the previous window. Admin should review the drivers before the next shift handover.`,
        department: worstDepartment?.name || "All departments",
        action: "Assign a responsible owner, define the corrective action, and verify closure with a follow-up check within 24 hours.",
      },
      {
        id: "fallback-department",
        tone: worstDepartment ? "warning" : "success",
        title: worstDepartment ? `${worstDepartment.name} requires service quality review` : "No immediate department risk detected",
        body: worstDepartment
          ? `${worstDepartment.name} has ${worstDepartment.feedbackCount} feedback items with ${worstDepartment.satisfaction}% satisfaction. A focused admin review can prevent repeat complaints.`
          : "No department has enough matching feedback to detect a clear risk.",
        department: worstDepartment?.name || "All departments",
        action: "Run a department huddle, inspect the related service area, document corrective actions, and confirm completion in the next admin review.",
      },
      {
        id: "fallback-resolution",
        tone: metrics.overduePendingCount > 0 ? "warning" : "success",
        title: metrics.overduePendingCount > 0 ? "Pending feedback requires escalation" : "Pending feedback is within control limits",
        body: `${metrics.overduePendingCount || 0} pending item${metrics.overduePendingCount === 1 ? "" : "s"} are older than the expected response window.`,
        department: "All departments",
        action: "Escalate aged feedback to the department owner, record the resolution status, and notify the patient after action is completed.",
      },
    ],
    positiveInsights: [
      {
        title: bestDepartment ? `${bestDepartment.name} satisfaction strength` : "Positive feedback signal",
        body: bestDepartment
          ? `${bestDepartment.name} is showing comparatively stronger satisfaction in the selected data.`
          : "There is not enough positive feedback in the selected view to identify a clear strength.",
        department: bestDepartment?.name || "All departments",
        recommendation: bestDepartment
          ? "Recognize the practices driving positive feedback and repeat them across lower-performing departments."
          : "Encourage patients to share positive comments so administrators can identify repeatable service strengths.",
      },
    ],
    negativeInsights: [
      {
        title: worstDepartment ? `${worstDepartment.name} improvement opportunity` : "Negative feedback signal",
        body: worstDepartment
          ? `${worstDepartment.name} has the weakest satisfaction signal in the selected data.`
          : "There is not enough negative feedback in the selected view to identify a clear risk.",
        department: worstDepartment?.name || "All departments",
        recommendation: worstDepartment
          ? "Review recent negative cases, inspect the related service area, and assign corrective action with a clear owner."
          : "Continue monitoring negative feedback daily and escalate repeated issues quickly.",
      },
    ],
    mixedInsights: [
      {
        title: mixedDepartment?.mixedCount > 0 ? `${mixedDepartment.name} mixed experience pattern` : "Mixed feedback signal",
        body: mixedDepartment?.mixedCount > 0
          ? `${mixedDepartment.name} has mixed feedback, which usually means part of the experience worked while another part needs attention.`
          : "There is not enough mixed feedback in the selected view to identify an ambiguous service pattern.",
        department: mixedDepartment?.name || "All departments",
        recommendation: mixedDepartment?.mixedCount > 0
          ? "Separate what patients appreciated from what disappointed them, then preserve the strength while fixing the service gap."
          : "Ask follow-up questions when patients give partial satisfaction so the admin team can identify both strengths and gaps.",
      },
    ],
    priorityActions: [
      {
        priority: riskLevel === "High" ? "High" : "Medium",
        department: worstDepartment?.name || "All departments",
        action: "Review recent negative feedback, identify recurring maintenance or service gaps, and assign one accountable owner per issue.",
        why: "Clear ownership and fast verification reduce repeat complaints and improve service reliability.",
        owner: "Department head",
        timeframe: "Today",
      },
      {
        priority: "Medium",
        department: "All departments",
        action: "Contact patients whose concerns remain unresolved and confirm that corrective action has been initiated.",
        why: "A timely callback demonstrates accountability and can prevent dissatisfaction from escalating.",
        owner: "Admin team",
        timeframe: "Within 24 hours",
      },
      {
        priority: "Medium",
        department: "All departments",
        action: "Review pending cases beyond the response standard and escalate them during the daily operations meeting.",
        why: "Delayed closure lowers confidence in hospital service quality.",
        owner: "Operations lead",
        timeframe: "Daily",
      },
    ],
    departmentPlaybook: [
      {
        department: worstDepartment?.name || "All departments",
        riskReason: worstDepartment ? `${worstDepartment.name} has the lowest satisfaction in the current view and should be reviewed for preventable service gaps.` : "No clear department risk is available yet.",
        dailyHuddleTopic: "Which complaints repeated, what corrective action is required, and who will verify completion?",
        preventionSteps: [
          "Review recent negative feedback with the department owner.",
          "Inspect the relevant facility or service area and document findings.",
          "Assign corrective action with a target completion time.",
          "Verify completion before the next shift handover.",
        ],
      },
    ],
    preventionChecklist: [
      "Review unresolved negative feedback at the start of each shift.",
      "Assign each complaint to a named department owner.",
      "Inspect affected maintenance or service areas and document corrective action.",
      "Confirm closure before shift handover.",
      "Call back patients after action is completed.",
      "Track whether the same issue repeats within 48 hours.",
    ],
    followUpQuestions: [
      "Which issue category repeated most frequently in the selected period?",
      "Which department has the slowest feedback closure time?",
      "Which facility or service area needs inspection today?",
      "Which patient cases require a manager callback before the end of the day?",
    ],
    patientMessageDrafts: [
      {
        scenario: "Negative feedback follow-up",
        message: "Thank you for sharing your feedback. We apologize for the inconvenience and have escalated your concern to the responsible department for corrective action. We will review the issue and update you once the action is completed.",
      },
    ],
  };
};

export const generateFeedbackInsights = async ({ records = [], comparisonRecords = [], metrics = {}, rangeLabel = "current period", filterContext = {} }) => {
  const provider = getAiProvider();
  if (provider === "fallback" || (provider === "gemini" && !process.env.GEMINI_API_KEY) || (provider === "openai" && !process.env.OPENAI_API_KEY)) {
    return buildFallbackInsights({ records, comparisonRecords, metrics, rangeLabel });
  }

  const model = getConfiguredModel(provider);
  const payload = buildAgentInput({ records, comparisonRecords, metrics, rangeLabel, filterContext });
  const cacheKey = crypto.createHash("sha256").update(JSON.stringify({ provider, model, payload })).digest("hex");
  const cached = modelCache.get(cacheKey);
  if (cached?.expiresAt > Date.now()) {
    return cached.value;
  }

  const normalized = provider === "gemini"
    ? await callGeminiInsights({ model, payload })
    : await callOpenAiInsights({ model, payload });
  modelCache.set(cacheKey, {
    value: normalized,
    expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
  });
  return normalized;
};
