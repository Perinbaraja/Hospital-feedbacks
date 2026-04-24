import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import _userRoutes from './routes/userRoutes.js';
import _hospitalRoutes from './routes/hospitalRoutes.js';
import _feedbackRoutes from './routes/feedbackRoutes.js';
import _superAdminRoutes from './routes/superAdminRoutes.js';
import _departmentRoutes from './routes/departmentRoutes.js';
import _Feedback from './models/Feedback.js';
import { protect, admin } from './routes/userRoutes.js';
import { buildFallbackInsights, generateFeedbackInsights } from './services/aiInsightsAgent.js';

const userRoutes = _userRoutes?.default || _userRoutes;
const hospitalRoutes = _hospitalRoutes?.default || _hospitalRoutes;
const feedbackRoutes = _feedbackRoutes?.default || _feedbackRoutes;
const superAdminRoutes = _superAdminRoutes?.default || _superAdminRoutes;
const departmentRoutes = _departmentRoutes?.default || _departmentRoutes;
const Feedback = _Feedback?.default || _Feedback;

let __appDirname;
if (typeof __dirname !== 'undefined') {
  __appDirname = __dirname;
} else if (typeof import.meta !== 'undefined' && import.meta.url) {
  const __appFilename = fileURLToPath(import.meta.url);
  __appDirname = path.dirname(__appFilename);
} else {
  __appDirname = path.resolve(process.cwd(), 'backend');
}

// Load .env for local development (Netlify provides env vars in deployed runtime)
dotenv.config({ path: path.join(__appDirname, '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const app = express();

app.use(
  cors({
    origin: '*',
  })
);

// Netlify function path prefix handling
// Requests arrive as '/.netlify/functions/api/...' when called directly; strip the prefix for routing.
app.use((req, res, next) => {
  const prefixes = ['/.netlify/functions/api', '/api'];
  for (const prefix of prefixes) {
    if (req.path.startsWith(prefix)) {
      req.url = req.url.replace(prefix, '') || '/';
      break; 
    }
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API routes (direct root path inside Lambda function)
app.use('/users', userRoutes);
app.use('/hospital', hospitalRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/departments', departmentRoutes);
app.use('/department', departmentRoutes);

const DASHBOARD_RANGE_TO_DAYS = {
  today: 1,
  yesterday: 1,
  '24h': 1,
  '7d': 7,
  '30d': 30,
  last7days: 7,
  last30days: 30,
  last7Days: 7,
  last30Days: 30,
  custom: 7,
};

const positiveReviewTypes = ['Positive', 'positive', 'completely_satisfied', 'completely satisfied'];
const negativeReviewTypes = ['Negative', 'negative', 'needs_work', 'Needs Work', 'not_satisfied', 'not satisfied'];
const mixedReviewTypes = ['Mixed'];

const normalizeSentiment = (reviewType) => {
  const normalized = String(reviewType || '').trim().toLowerCase();
  if (mixedReviewTypes.some((value) => value.toLowerCase() === normalized)) return 'Mixed';
  if (positiveReviewTypes.some((value) => value.toLowerCase() === normalized)) return 'Positive';
  if (negativeReviewTypes.some((value) => value.toLowerCase() === normalized)) return 'Negative';
  return 'Negative';
};

const uniqueStrings = (values = []) => [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];

const collectCategoryTags = (category = {}, keys = []) => uniqueStrings(
  keys.flatMap((key) => (Array.isArray(category?.[key]) ? category[key] : []))
);

const classifyFeedbackFromCategory = (category = {}) => {
  const positiveTags = collectCategoryTags(category, ['positive_feedback', 'positive_issues']);
  const negativeTags = collectCategoryTags(category, ['negative_feedback', 'negative_issues']);

  if (positiveTags.length > 0 && negativeTags.length > 0) {
    return { sentiment: 'Mixed', positiveTags, negativeTags };
  }

  if (positiveTags.length > 0) {
    return { sentiment: 'Positive', positiveTags, negativeTags };
  }

  if (negativeTags.length > 0) {
    return { sentiment: 'Negative', positiveTags, negativeTags };
  }

  return {
    sentiment: normalizeSentiment(category.reviewType),
    positiveTags,
    negativeTags,
  };
};

const classifyFeedbackDoc = (feedback = {}) => {
  const categories = Array.isArray(feedback.categories) ? feedback.categories : [];
  const positiveTags = uniqueStrings(categories.flatMap((category) => collectCategoryTags(category, ['positive_feedback', 'positive_issues'])));
  const negativeTags = uniqueStrings(categories.flatMap((category) => collectCategoryTags(category, ['negative_feedback', 'negative_issues'])));

  if (positiveTags.length > 0 && negativeTags.length > 0) {
    return { sentiment: 'Mixed', positiveTags, negativeTags };
  }

  if (positiveTags.length > 0) {
    return { sentiment: 'Positive', positiveTags, negativeTags };
  }

  if (negativeTags.length > 0) {
    return { sentiment: 'Negative', positiveTags, negativeTags };
  }

  const categorySentiments = uniqueStrings(categories.map((category) => classifyFeedbackFromCategory(category).sentiment));
  if (categorySentiments.includes('Mixed') || (categorySentiments.includes('Positive') && categorySentiments.includes('Negative'))) {
    return { sentiment: 'Mixed', positiveTags, negativeTags };
  }
  if (categorySentiments.includes('Positive')) {
    return { sentiment: 'Positive', positiveTags, negativeTags };
  }
  if (categorySentiments.includes('Negative')) {
    return { sentiment: 'Negative', positiveTags, negativeTags };
  }

  if (feedback.positive && feedback.negative) {
    return { sentiment: 'Mixed', positiveTags, negativeTags };
  }
  if (feedback.positive) {
    return { sentiment: 'Positive', positiveTags, negativeTags };
  }
  return { sentiment: 'Negative', positiveTags, negativeTags };
};

const parseDashboardDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDashboardCurrentRange = ({ queryDate, queryRange, fromDate, toDate }) => {
  const explicitFromDate = parseDashboardDate(fromDate);
  const explicitToDate = parseDashboardDate(toDate);
  if (explicitFromDate && explicitToDate) {
    return {
      currentStart: explicitFromDate,
      currentEnd: explicitToDate,
      rangeDays: Math.max(1, Math.ceil((explicitToDate.getTime() - explicitFromDate.getTime() + 1) / (24 * 60 * 60 * 1000))),
    };
  }

  const selectedDate = parseDashboardDate(queryDate);
  if (selectedDate) {
    return {
      currentStart: startOfDay(selectedDate),
      currentEnd: endOfDay(selectedDate),
      rangeDays: 1,
    };
  }

  const normalizedRange = String(queryRange || '').trim().toLowerCase() || '7d';
  if (normalizedRange === 'alltime' || String(queryRange || '').trim().toLowerCase() === 'alltime') {
    const daysInRange = 30;
    const currentEnd = endOfDay();
    const currentStart = startOfDay();
    currentStart.setDate(currentStart.getDate() - (daysInRange - 1));
    return {
      currentStart,
      currentEnd,
      rangeDays: daysInRange,
      isAllTime: true,
    };
  }
  if (normalizedRange === 'today') {
    return {
      currentStart: startOfDay(),
      currentEnd: endOfDay(),
      rangeDays: 1,
    };
  }

  if (normalizedRange === 'yesterday') {
    const yesterday = startOfDay();
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      currentStart: startOfDay(yesterday),
      currentEnd: endOfDay(yesterday),
      rangeDays: 1,
    };
  }

  const rangeDays = DASHBOARD_RANGE_TO_DAYS[normalizedRange] || 7;
  const currentEnd = new Date();
  const currentStart = startOfDay(currentEnd);
  currentStart.setDate(currentStart.getDate() - (rangeDays - 1));
  return {
    currentStart,
    currentEnd,
    rangeDays,
  };
};

const isWithinRange = (value, rangeStart, rangeEnd) => {
  const date = new Date(value);
  return date >= rangeStart && date <= rangeEnd;
};

const normalizeDashboardRecord = (feedback = {}) => {
  const categories = Array.isArray(feedback.categories) ? feedback.categories : [];
  const serviceNames = uniqueStrings(categories.map((category) => category?.department).filter(Boolean));
  const primaryCategory = categories[0] || {};
  const classification = classifyFeedbackDoc(feedback);
  const positiveTags = classification.positiveTags;
  const negativeTags = classification.negativeTags;
  const comment = String(feedback.comments || primaryCategory.note || '').trim() || 'No additional comments provided.';
  const createdAt = new Date(feedback.createdAt);

  return {
    id: feedback.feedbackId || feedback._id?.toString(),
    patientName: feedback.patientName || 'Anonymous',
    patientEmail: feedback.patientEmail || 'No email provided',
    service: serviceNames[0] || feedback.assignedTo || 'General',
    services: serviceNames.length ? serviceNames : [feedback.assignedTo || 'General'],
    positiveTags,
    negativeTags,
    sentimentLabel: classification.sentiment,
    sentiment: classification.sentiment.toLowerCase(),
    comment,
    createdAt: createdAt.toISOString(),
    status: feedback.status || 'Pending',
    image: feedback.image || primaryCategory.image || '',
  };
};

const percentageChange = (currentValue, previousValue) => {
  if (!previousValue) return currentValue > 0 ? 100 : 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

// @desc    Dashboard Metrics (Central Route for frontend binding)
// @route   GET /api/admin/dashboard
app.get('/admin/dashboard', protect, admin, async (req, res) => {
    try {
        const query = {};
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedAuthRole === 'superadmin';
        
        const {
          hospitalId: queryHospitalId,
          department: queryDepartment,
          date: queryDate,
          range: queryRange,
          fromDate: queryFromDate,
          toDate: queryToDate,
          searchTerm: querySearchTerm,
        } = req.query;

        if (!isSuperAdmin) {
            // Normal Admin: Restricted to their own hospital
            query.hospitalId = req.user.hospitalId;
        } else if (queryHospitalId) {
            // Super Admin: View a specific hospital if requested
            query.hospitalId = queryHospitalId;
        }
        // If super admin and no hospitalId, query remains empty (total aggregate for super admin overview)

        const selectedDepartment = String(queryDepartment || '').trim();
        const selectedSearchTerm = String(querySearchTerm || '').trim().toLowerCase();
        const { currentStart, currentEnd, rangeDays, isAllTime } = buildDashboardCurrentRange({
          queryDate,
          queryRange,
          fromDate: queryFromDate,
          toDate: queryToDate,
        });
        const comparisonWindowMs = currentEnd.getTime() - currentStart.getTime() + 1;
        const trendPreviousStart = new Date(currentStart.getTime() - comparisonWindowMs);
        const trendPreviousEnd = new Date(currentStart.getTime() - 1);
        const todayStart = startOfDay();
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const pendingThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
        query.createdAt = isAllTime
          ? { $lte: currentEnd }
          : {
              $gte: trendPreviousStart,
              $lte: currentEnd,
            };

        const feedbackDocs = await Feedback.find(query).sort({ createdAt: -1 }).lean();
        const normalizedRecords = feedbackDocs.map((item) => normalizeDashboardRecord(item));
        const departmentFilteredRecords = selectedDepartment
          ? normalizedRecords.filter((record) => record.services.includes(selectedDepartment) || record.service === selectedDepartment)
          : normalizedRecords;
        const searchFilteredRecords = selectedSearchTerm
          ? departmentFilteredRecords.filter((record) => {
              const searchable = [
                record.id,
                record.patientName,
                record.patientEmail,
                record.service,
                record.comment,
                ...(record.positiveTags || []),
                ...(record.negativeTags || []),
              ].join(' ').toLowerCase();
              return searchable.includes(selectedSearchTerm);
            })
          : departmentFilteredRecords;
        const currentRecords = isAllTime
          ? searchFilteredRecords
          : searchFilteredRecords.filter((record) => isWithinRange(record.createdAt, currentStart, currentEnd));
        const previousRecords = isAllTime
          ? []
          : searchFilteredRecords.filter((record) => isWithinRange(record.createdAt, trendPreviousStart, trendPreviousEnd));
        const dailyFeedbackMap = new Map();
        const dailyFeedback = [];
        currentRecords.forEach((record) => {
          const dayKey = new Date(record.createdAt).toISOString().slice(0, 10);
          dailyFeedbackMap.set(dayKey, (dailyFeedbackMap.get(dayKey) || 0) + 1);
        });

        for (let offset = 0; offset < rangeDays; offset += 1) {
          const date = new Date(currentStart);
          date.setDate(currentStart.getDate() + offset);
          const dayKey = date.toISOString().slice(0, 10);
          dailyFeedback.push({
            day: dayKey,
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            count: dailyFeedbackMap.get(dayKey) || 0,
          });
        }

        const totalEncounters = currentRecords.length;
        const positiveCount = currentRecords.filter((record) => record.sentimentLabel === 'Positive').length;
        const negativeCount = currentRecords.filter((record) => record.sentimentLabel === 'Negative').length;
        const mixedCount = currentRecords.filter((record) => record.sentimentLabel === 'Mixed').length;
        const resolvedIssues = currentRecords.filter((record) => record.status === 'COMPLETED').length;
        const pendingCount = currentRecords.filter((record) => record.status === 'Pending').length;
        const inProgressCount = currentRecords.filter((record) => record.status === 'IN PROGRESS').length;
        const todayCount = currentRecords.filter((record) => isWithinRange(record.createdAt, todayStart, tomorrowStart)).length;
        const overduePendingCount = feedbackDocs.filter((item) => item.status === 'Pending' && item.createdAt < pendingThreshold && isWithinRange(item.createdAt, currentStart, currentEnd)).length;
        const currentPeriodTotal = currentRecords.length;
        const previousPeriodTotal = previousRecords.length;
        const completionRate = totalEncounters > 0 ? Math.round((resolvedIssues / totalEncounters) * 100) : 0;
        const positiveRate = totalEncounters > 0 ? Math.round((positiveCount / totalEncounters) * 100) : 0;
        const avgDailyFeedback = Math.round((currentPeriodTotal / Math.max(rangeDays, 1)) * 10) / 10;
        const weeklyTrendPercent = isAllTime ? 0 : percentageChange(currentPeriodTotal, previousPeriodTotal);
        const departmentMap = new Map();
        currentRecords.forEach((record) => {
          const currentValue = departmentMap.get(record.service) || {
            name: record.service,
            feedbackCount: 0,
            positiveCount: 0,
            negativeCount: 0,
            mixedCount: 0,
          };
          currentValue.feedbackCount += 1;
          if (record.sentimentLabel === 'Positive') currentValue.positiveCount += 1;
          if (record.sentimentLabel === 'Negative') currentValue.negativeCount += 1;
          if (record.sentimentLabel === 'Mixed') currentValue.mixedCount += 1;
          departmentMap.set(record.service, currentValue);
        });
        const departmentMetrics = [...departmentMap.values()]
          .map((item) => ({
            ...item,
            satisfaction: item.feedbackCount > 0 ? Math.round((item.positiveCount / item.feedbackCount) * 100) : 0,
          }))
          .sort((a, b) => b.feedbackCount - a.feedbackCount || a.name.localeCompare(b.name));
        const topDepartment = departmentMetrics[0] || null;
        const activeDepartments = departmentMetrics.length;
        const sentimentSummary = [
          { name: 'Positive', value: totalEncounters ? Math.round((positiveCount / totalEncounters) * 100) : 0, count: positiveCount, fill: '#10b981' },
          { name: 'Negative', value: totalEncounters ? Math.round((negativeCount / totalEncounters) * 100) : 0, count: negativeCount, fill: '#ef4444' },
          { name: 'Mixed', value: totalEncounters ? Math.round((mixedCount / totalEncounters) * 100) : 0, count: mixedCount, fill: '#f59e0b' }
        ];

        const departmentPeriodMap = new Map();
        [...previousRecords, ...currentRecords].forEach((record) => {
          const departmentName = record.service || 'Unassigned';
          const periodKey = isWithinRange(record.createdAt, currentStart, currentEnd) ? 'current' : 'previous';
          const currentValue = departmentPeriodMap.get(departmentName) || {
            current: { totalCount: 0, positiveCount: 0, negativeCount: 0 },
            previous: { totalCount: 0, positiveCount: 0, negativeCount: 0 }
          };
          currentValue[periodKey].totalCount += 1;
          if (record.sentimentLabel === 'Positive') currentValue[periodKey].positiveCount += 1;
          if (record.sentimentLabel === 'Negative') currentValue[periodKey].negativeCount += 1;
          departmentPeriodMap.set(departmentName, currentValue);
        });

        const departmentChanges = [...departmentPeriodMap.entries()].map(([name, value]) => ({
          name,
          current: value.current,
          previous: value.previous,
          negativeTrend: percentageChange(value.current.negativeCount, value.previous.negativeCount),
          positiveRate: value.current.totalCount > 0
            ? Math.round((value.current.positiveCount / value.current.totalCount) * 100)
            : 0
        }));

        const risingComplaintDepartment = [...departmentChanges]
          .sort((a, b) => b.negativeTrend - a.negativeTrend)[0] || null;
        const bestDepartment = [...departmentMetrics]
          .sort((a, b) => b.satisfaction - a.satisfaction || a.name.localeCompare(b.name))[0] || null;
        const recentFeedback = [...currentRecords]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 12)
          .map((record) => ({
            ...record,
            tags: [...record.positiveTags, ...record.negativeTags].slice(0, 4),
          }));

        const insights = [
          risingComplaintDepartment
            ? {
                id: 'rising-complaints',
                tone: risingComplaintDepartment.negativeTrend > 0 ? 'danger' : 'warning',
                title: `${risingComplaintDepartment.name} complaints ${risingComplaintDepartment.negativeTrend > 0 ? 'increased' : 'stabilized'}`,
                body: risingComplaintDepartment.negativeTrend > 0
                  ? `${risingComplaintDepartment.name} negative feedback rose by ${Math.abs(risingComplaintDepartment.negativeTrend)}% in the current monitoring window.`
                  : `${risingComplaintDepartment.name} has the highest complaint volume in the current monitoring window.`
              }
            : {
                id: 'rising-complaints',
                tone: 'warning',
                title: 'Complaint trend is stable',
                body: 'No department showed a sharp complaint spike in the current monitoring window.'
              },
          bestDepartment
            ? {
                id: 'top-service',
                tone: 'success',
                title: `${bestDepartment.name} leads patient satisfaction`,
                body: `${bestDepartment.name} currently has a ${bestDepartment.satisfaction}% positive satisfaction score from recorded service feedback.`
              }
            : {
                id: 'top-service',
                tone: 'success',
                title: 'Satisfaction insights will appear here',
                body: 'Collect more feedback entries to see the strongest-performing department.'
              },
          {
            id: 'aging-pending',
            tone: overduePendingCount > 0 ? 'warning' : 'success',
            title: overduePendingCount > 0
              ? `${overduePendingCount} feedback ${overduePendingCount === 1 ? 'item is' : 'items are'} pending over 2 days`
              : 'No overdue pending feedback',
            body: overduePendingCount > 0
              ? 'Review older pending cases to improve response time and keep issue resolution moving.'
              : 'All pending cases are within the expected response window.'
          }
        ];

        let aiInsights;
        try {
          aiInsights = await generateFeedbackInsights({
            records: currentRecords,
            comparisonRecords: previousRecords,
            rangeLabel: isAllTime ? 'All Time' : `${rangeDays} day window`,
            filterContext: {
              department: selectedDepartment || 'All',
              searchTerm: selectedSearchTerm || '',
              range: queryRange || 'alltime',
            },
            metrics: {
              totalFeedback: totalEncounters,
              positiveRate,
              negativeCount,
              mixedCount,
              completionRate,
              overduePendingCount,
              departmentMetrics,
            },
          });
        } catch (insightError) {
          console.error('AI insight agent failed:', insightError.message);
          aiInsights = buildFallbackInsights({
            records: currentRecords,
            comparisonRecords: previousRecords,
            rangeLabel: isAllTime ? 'All Time' : `${rangeDays} day window`,
            metrics: {
              totalFeedback: totalEncounters,
              positiveRate,
              negativeCount,
              mixedCount,
              completionRate,
              overduePendingCount,
              departmentMetrics,
            },
          });
          aiInsights.source = 'error-fallback';
          aiInsights.provider = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
          aiInsights.model = process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || 'configured model';
          aiInsights.error = insightError.message;
        }

        res.json({
            totalEncounters,
            positiveCount,
            negativeCount,
            mixedCount,
            resolvedIssues,
            pendingCount,
            inProgressCount,
            overduePendingCount,
            todayCount,
            activeDepartments,
            completionRate,
            positiveRate,
            avgDailyFeedback,
            weeklyTrendPercent,
            topDepartment,
            lastUpdated: new Date().toISOString(),
            rangeDays,
            dailyFeedback,
            sentimentSummary,
            departmentMetrics,
            recentFeedback,
            feedbackRecords: currentRecords,
            comparisonRecords: previousRecords,
            insights,
            aiInsights
        });
    } catch (error) {
        console.error('Core Dashboard Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// health check path (always available at function root)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Feedback API (serverless) is running' });
});

export default app;
