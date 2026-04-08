export const DATE_PRESET_OPTIONS = [
  { value: "alltime", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7Days", label: "Last 7 Days" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

export const SENTIMENT_COLORS = {
  Positive: "#10b981",
  Negative: "#ef4444",
  Mixed: "#f59e0b",
};

export const STATUS_COLORS = {
  positive: { background: "rgba(16,185,129,0.12)", color: "#047857", label: "Satisfied" },
  negative: { background: "rgba(239,68,68,0.12)", color: "#b91c1c", label: "Unsatisfied" },
  mixed: { background: "rgba(245,158,11,0.14)", color: "#b45309", label: "Mixed" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

export const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateRangeFromPreset = (preset, fromDate, toDate) => {
  const today = new Date();
  const rawPreset = String(preset || "last7Days").trim();
  const normalizedPreset = rawPreset.toLowerCase();
  const presetKey = ["last7days", "7d"].includes(normalizedPreset)
    ? "last7Days"
    : ["last30days", "30d"].includes(normalizedPreset)
    ? "last30Days"
    : normalizedPreset === "alltime"
    ? "alltime"
    : normalizedPreset === "today"
    ? "today"
    : normalizedPreset === "yesterday"
    ? "yesterday"
    : normalizedPreset === "custom"
    ? "custom"
    : "last7Days";

  if (presetKey === "today") {
    const currentStart = startOfDay(today);
    const currentEnd = endOfDay(today);
    return {
      preset: presetKey,
      label: "Today",
      currentStart,
      currentEnd,
      previousStart: addDays(currentStart, -1),
      previousEnd: new Date(currentStart.getTime() - 1),
      daysInRange: 1,
    };
  }

  if (presetKey === "yesterday") {
    const yesterday = addDays(today, -1);
    const currentStart = startOfDay(yesterday);
    const currentEnd = endOfDay(yesterday);
    return {
      preset: presetKey,
      label: "Yesterday",
      currentStart,
      currentEnd,
      previousStart: addDays(currentStart, -1),
      previousEnd: new Date(currentStart.getTime() - 1),
      daysInRange: 1,
    };
  }

  if (presetKey === "custom" && fromDate && toDate) {
    const orderedFrom = new Date(Math.min(fromDate.getTime(), toDate.getTime()));
    const orderedTo = new Date(Math.max(fromDate.getTime(), toDate.getTime()));
    const currentStart = startOfDay(orderedFrom);
    const currentEnd = endOfDay(orderedTo);
    const daysInRange = Math.max(1, Math.ceil((currentEnd.getTime() - currentStart.getTime() + 1) / DAY_MS));
    return {
      preset: presetKey,
      label: "Custom Range",
      currentStart,
      currentEnd,
      previousStart: new Date(currentStart.getTime() - daysInRange * DAY_MS),
      previousEnd: new Date(currentStart.getTime() - 1),
      daysInRange,
    };
  }

  if (presetKey === "alltime") {
    const daysInRange = 30;
    const currentEnd = endOfDay(today);
    const currentStart = startOfDay(addDays(today, -(daysInRange - 1)));
    return {
      preset: presetKey,
      label: "All Time",
      currentStart,
      currentEnd,
      previousStart: addDays(currentStart, -daysInRange),
      previousEnd: new Date(currentStart.getTime() - 1),
      daysInRange,
      isAllTime: true,
    };
  }

  const daysInRange = presetKey === "last30Days" ? 30 : 7;
  const currentEnd = endOfDay(today);
  const currentStart = startOfDay(addDays(today, -(daysInRange - 1)));
  return {
    preset: presetKey,
    label: daysInRange === 30 ? "Last 30 Days" : "Last 7 Days",
    currentStart,
    currentEnd,
    previousStart: new Date(currentStart.getTime() - daysInRange * DAY_MS),
    previousEnd: new Date(currentStart.getTime() - 1),
    daysInRange,
  };
};

export const isWithinRange = (value, start, end) => {
  const date = new Date(value);
  return date >= start && date <= end;
};

export const matchesDashboardFilters = (record, searchTerm, department) => {
  const loweredSearch = String(searchTerm || "").trim().toLowerCase();
  const matchesSearch =
    !loweredSearch ||
    String(record.id || "").toLowerCase().includes(loweredSearch) ||
    String(record.patientName || "").toLowerCase().includes(loweredSearch) ||
    String(record.patientEmail || "").toLowerCase().includes(loweredSearch) ||
    String(record.service || "").toLowerCase().includes(loweredSearch) ||
    String(record.comment || "").toLowerCase().includes(loweredSearch) ||
    [...(record.positiveTags || []), ...(record.negativeTags || [])].some((tag) => String(tag).toLowerCase().includes(loweredSearch));

  const matchesDepartment = department === "All" || !department || record.service === department;
  return matchesSearch && matchesDepartment;
};

export const formatRelativeTime = (value) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const formatChartDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${day}`;
};

const groupByDaySentiment = (records, currentStart, daysInRange) => {
  const countByDay = new Map();

  records.forEach((record) => {
    const key = formatDateInput(record.createdAt);
    const bucket = countByDay.get(key) || { positive: 0, mixed: 0, negative: 0 };
    if (record.sentimentLabel === "Positive") {
      bucket.positive += 1;
    } else if (record.sentimentLabel === "Mixed") {
      bucket.mixed += 1;
    } else {
      bucket.negative += 1;
    }
    countByDay.set(key, bucket);
  });

  return Array.from({ length: daysInRange }).map((_, index) => {
    const date = addDays(currentStart, index);
    const key = formatDateInput(date);
    const bucket = countByDay.get(key) || { positive: 0, mixed: 0, negative: 0 };
    const total = bucket.positive + bucket.mixed + bucket.negative;

    return {
      label: formatChartDateLabel(date),
      positive: bucket.positive,
      mixed: bucket.mixed,
      negative: bucket.negative,
      total,
    };
  });
};

const buildDepartmentMetrics = (records) => {
  const departmentMap = new Map();

  records.forEach((record) => {
    const currentValue = departmentMap.get(record.service) || {
      name: record.service,
      feedbackCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      mixedCount: 0,
    };

    currentValue.feedbackCount += 1;
    if (record.sentimentLabel === "Positive") currentValue.positiveCount += 1;
    if (record.sentimentLabel === "Negative") currentValue.negativeCount += 1;
    if (record.sentimentLabel === "Mixed") currentValue.mixedCount += 1;
    departmentMap.set(record.service, currentValue);
  });

  return [...departmentMap.values()]
    .map((item) => ({
      ...item,
      satisfaction: item.feedbackCount ? Math.round((item.positiveCount / item.feedbackCount) * 100) : 0,
      positiveVisual: item.positiveCount,
      mixedVisual: item.mixedCount,
      negativeVisual: item.negativeCount,
    }))
    .sort((a, b) => b.feedbackCount - a.feedbackCount || a.name.localeCompare(b.name));
};

const buildDepartmentComparison = (currentRecords, previousRecords) => {
  const comparisonMap = new Map();
  [...previousRecords, ...currentRecords].forEach((record) => {
    const key = record.service;
    const bucket = comparisonMap.get(key) || {
      name: key,
      current: { totalCount: 0, positiveCount: 0, negativeCount: 0 },
      previous: { totalCount: 0, positiveCount: 0, negativeCount: 0 },
    };
    const target = currentRecords.includes(record) ? bucket.current : bucket.previous;
    target.totalCount += 1;
    if (record.sentimentLabel === "Positive") target.positiveCount += 1;
    if (record.sentimentLabel === "Negative") target.negativeCount += 1;
    comparisonMap.set(key, bucket);
  });

  return [...comparisonMap.values()].map((item) => {
    const previousNegative = item.previous.negativeCount;
    const currentNegative = item.current.negativeCount;
    const negativeTrend = previousNegative === 0 ? (currentNegative > 0 ? 100 : 0) : Math.round(((currentNegative - previousNegative) / previousNegative) * 100);
    return {
      ...item,
      negativeTrend,
      positiveRate: item.current.totalCount ? Math.round((item.current.positiveCount / item.current.totalCount) * 100) : 0,
    };
  });
};

const buildRadarData = (trendData) => {
  if (!Array.isArray(trendData) || trendData.length === 0) return trendData;
  const maxAxes = 7;
  if (trendData.length <= maxAxes) return trendData;

  const bucketSize = Math.ceil(trendData.length / maxAxes);
  const radarBuckets = [];

  for (let index = 0; index < trendData.length; index += bucketSize) {
    const slice = trendData.slice(index, index + bucketSize);
    const label = `Period ${Math.floor(index / bucketSize) + 1}`;
    radarBuckets.push({
      label,
      positive: slice.reduce((sum, item) => sum + (item.positive || 0), 0),
      mixed: slice.reduce((sum, item) => sum + (item.mixed || 0), 0),
      negative: slice.reduce((sum, item) => sum + (item.negative || 0), 0),
    });
  }

  return radarBuckets;
};

export const deriveDashboardState = ({ currentRecords, comparisonRecords, dateRange }) => {
  const totalEncounters = currentRecords.length;
  const positiveCount = currentRecords.filter((record) => record.sentimentLabel === "Positive").length;
  const negativeCount = currentRecords.filter((record) => record.sentimentLabel === "Negative").length;
  const mixedCount = currentRecords.filter((record) => record.sentimentLabel === "Mixed").length;
  const resolvedIssues = currentRecords.filter((record) => record.status === "COMPLETED").length;
  const pendingCount = currentRecords.filter((record) => record.status === "Pending").length;
  const inProgressCount = currentRecords.filter((record) => record.status === "IN PROGRESS").length;
  const overduePendingCount = currentRecords.filter(
    (record) => record.status === "Pending" && new Date(record.createdAt).getTime() < Date.now() - 48 * 60 * 60 * 1000
  ).length;
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const todayCount = currentRecords.filter((record) => isWithinRange(record.createdAt, todayStart, todayEnd)).length;
  const positiveRate = totalEncounters ? Math.round((positiveCount / totalEncounters) * 100) : 0;
  const completionRate = totalEncounters ? Math.round((resolvedIssues / totalEncounters) * 100) : 0;

  const recordDates = totalEncounters
    ? currentRecords.map((record) => startOfDay(new Date(record.createdAt)))
    : [];
  const firstRecordDate = recordDates.length ? new Date(Math.min(...recordDates.map((date) => date.getTime()))) : null;
  const chartStart = firstRecordDate && firstRecordDate > dateRange.currentStart
    ? firstRecordDate
    : dateRange.currentStart;
  const chartDays = Math.max(1, Math.ceil((dateRange.currentEnd.getTime() - chartStart.getTime() + 1) / DAY_MS));

  const avgDailyFeedback = Math.round((totalEncounters / Math.max(dateRange.daysInRange, 1)) * 10) / 10;
  const weeklyTrendPercent = comparisonRecords.length === 0
    ? (totalEncounters > 0 ? 100 : 0)
    : Math.round(((totalEncounters - comparisonRecords.length) / comparisonRecords.length) * 100);

  const trendData = groupByDaySentiment(currentRecords, chartStart, chartDays);
  const radarData = buildRadarData(trendData);

  const sentimentSummary = [
    { name: "Positive", count: positiveCount, value: totalEncounters ? Math.round((positiveCount / totalEncounters) * 100) : 0, fill: SENTIMENT_COLORS.Positive },
    { name: "Negative", count: negativeCount, value: totalEncounters ? Math.round((negativeCount / totalEncounters) * 100) : 0, fill: SENTIMENT_COLORS.Negative },
    { name: "Mixed", count: mixedCount, value: totalEncounters ? Math.round((mixedCount / totalEncounters) * 100) : 0, fill: SENTIMENT_COLORS.Mixed },
  ];

  const departmentMetrics = buildDepartmentMetrics(currentRecords);
  const topDepartment = departmentMetrics[0] || null;
  const worstDepartment = [...departmentMetrics].sort((a, b) => a.satisfaction - b.satisfaction || b.feedbackCount - a.feedbackCount)[0] || null;
  const departmentChanges = buildDepartmentComparison(currentRecords, comparisonRecords);
  const risingComplaintDepartment = [...departmentChanges].sort((a, b) => b.negativeTrend - a.negativeTrend)[0] || null;
  const bestDepartment = [...departmentMetrics].sort((a, b) => b.satisfaction - a.satisfaction || a.name.localeCompare(b.name))[0] || null;

  const smartInsights = [
    risingComplaintDepartment
      ? {
          id: "rising-complaints",
          tone: risingComplaintDepartment.negativeTrend > 0 ? "danger" : "warning",
          title: `${risingComplaintDepartment.name} complaints ${risingComplaintDepartment.negativeTrend > 0 ? "increased" : "stabilized"}`,
          body: risingComplaintDepartment.negativeTrend > 0
            ? `${risingComplaintDepartment.name} negative feedback moved by ${Math.abs(risingComplaintDepartment.negativeTrend)}% compared with the previous period.`
            : `${risingComplaintDepartment.name} currently has the highest negative volume in the filtered dataset.`,
        }
      : {
          id: "rising-complaints",
          tone: "warning",
          title: "Complaint trend is stable",
          body: "No department shows a notable complaint spike in the selected date range.",
        },
    bestDepartment
      ? {
          id: "best-service",
          tone: "success",
          title: `${bestDepartment.name} leads satisfaction`,
          body: `${bestDepartment.name} is currently running at a ${bestDepartment.satisfaction}% positive score across ${bestDepartment.feedbackCount} filtered feedback items.`,
        }
      : {
          id: "best-service",
          tone: "success",
          title: "Waiting for live satisfaction signals",
          body: "Feedback insights will appear here as soon as records match the selected filters.",
        },
    {
      id: "resolution",
      tone: overduePendingCount > 0 ? "warning" : "success",
      title: overduePendingCount > 0 ? `${overduePendingCount} pending items are overdue` : "No overdue pending feedback",
      body: overduePendingCount > 0
        ? "Older pending items should be reviewed to keep hospital response times healthy."
        : "All pending feedback in the current view is still inside the expected response window.",
    },
    {
      id: "volume",
      tone: weeklyTrendPercent >= 0 ? "success" : "warning",
      title: `${dateRange.label} volume ${weeklyTrendPercent >= 0 ? "is up" : "is down"}`,
      body: `${totalEncounters} records match the current filters, which is ${Math.abs(weeklyTrendPercent)}% ${weeklyTrendPercent >= 0 ? "higher" : "lower"} than the previous comparison window.`,
    },
  ];

  return {
    dashboardValues: {
      totalEncounters,
      positiveFeedback: positiveCount,
      negativeFeedback: negativeCount,
      resolvedIssues,
      todaysFeedback: todayCount,
      inProgress: inProgressCount,
    },
    subtitles: {
      totalEncounters: `${departmentMetrics.length} active departments in current view`,
      positiveFeedback: `${positiveRate}% positive rate across filtered feedback`,
      negativeFeedback: `${mixedCount} mixed responses need review`,
      resolvedIssues: `${completionRate}% completion rate`,
      todaysFeedback: `${avgDailyFeedback} average entries per day`,
      inProgress: `${overduePendingCount} pending for more than 2 days`,
    },
    trendData,
    sentimentSummary,
    departmentMetrics,
    topDepartment,
    worstDepartment,
    smartInsights,
    positiveRate,
    completionRate,
    todayCount,
    avgDailyFeedback,
    weeklyTrendPercent,
    activeDepartments: departmentMetrics.length,
    pendingCount,
    inProgressCount,
    overduePendingCount,
    totalEncounters,
    radarData,
  };
};
