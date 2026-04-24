import API from '../api.js';

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const DASHBOARD_CACHE_VERSION = 'v5-ai-agent-sentiment';
const STORAGE_PREFIX = `admin-dashboard-cache:${DASHBOARD_CACHE_VERSION}:`;
const memoryCache = new Map();
const inflightRequests = new Map();

const normalizeValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const buildDashboardKey = ({ hospitalId, department, searchTerm, date, range, fromDate, toDate } = {}) => {
    const normalizedHospitalId = normalizeValue(hospitalId);
    const normalizedDepartment = normalizeValue(department) || 'all';
    const normalizedSearchTerm = normalizeValue(searchTerm) || 'all';
    const normalizedDate = normalizeValue(date) || 'all';
    const normalizedRange = normalizeValue(range) || '7d';
    const normalizedFromDate = normalizeValue(fromDate) || 'all';
    const normalizedToDate = normalizeValue(toDate) || 'all';
    const hospitalKey = normalizedHospitalId ? `hospital:${normalizedHospitalId}` : 'hospital:self';
    return `${hospitalKey}|dept:${normalizedDepartment}|search:${normalizedSearchTerm}|date:${normalizedDate}|range:${normalizedRange}|from:${normalizedFromDate}|to:${normalizedToDate}`;
};

const readSessionCache = (key) => {
    try {
        const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
            window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

const writeSessionCache = (key, entry) => {
    try {
        window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
        // Ignore storage issues.
    }
};

export const getCachedAdminDashboard = ({ hospitalId, department, searchTerm, date, range, fromDate, toDate } = {}) => {
    const key = buildDashboardKey({ hospitalId, department, searchTerm, date, range, fromDate, toDate });
    const memoryEntry = memoryCache.get(key);

    if (memoryEntry?.expiresAt > Date.now()) {
        return memoryEntry.data;
    }

    const sessionEntry = readSessionCache(key);
    if (sessionEntry) {
        memoryCache.set(key, sessionEntry);
        return sessionEntry.data;
    }

    return null;
};

export const setCachedAdminDashboard = (data, { hospitalId, department, searchTerm, date, range, fromDate, toDate, ttlMs = DASHBOARD_CACHE_TTL_MS } = {}) => {
    const key = buildDashboardKey({ hospitalId, department, searchTerm, date, range, fromDate, toDate });
    const entry = {
        data,
        expiresAt: Date.now() + ttlMs
    };

    memoryCache.set(key, entry);
    writeSessionCache(key, entry);
    return data;
};

export const clearAdminDashboardCache = () => {
    memoryCache.clear();
    inflightRequests.clear();

    try {
        const keysToDelete = [];
        for (let index = 0; index < window.sessionStorage.length; index += 1) {
            const key = window.sessionStorage.key(index);
            if (key?.startsWith(STORAGE_PREFIX)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
        // Ignore storage cleanup issues.
    }
};

export const fetchAdminDashboard = async ({ hospitalId, department, searchTerm, date, range, fromDate, toDate } = {}, { forceRefresh = false, ttlMs = DASHBOARD_CACHE_TTL_MS } = {}) => {
    const key = buildDashboardKey({ hospitalId, department, searchTerm, date, range, fromDate, toDate });

    if (!forceRefresh) {
        const cached = getCachedAdminDashboard({ hospitalId, department, searchTerm, date, range, fromDate, toDate });
        if (cached) {
            return cached;
        }
    }

    if (inflightRequests.has(key)) {
        return inflightRequests.get(key);
    }

    const params = new URLSearchParams();
    if (hospitalId) params.set('hospitalId', hospitalId);
    if (department) params.set('department', department);
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (date) params.set('date', date);
    if (range) params.set('range', range);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const request = API.get(`/admin/dashboard${query}`)
        .then(({ data }) => setCachedAdminDashboard(data, { hospitalId, department, searchTerm, date, range, fromDate, toDate, ttlMs }))
        .finally(() => {
            inflightRequests.delete(key);
        });

    inflightRequests.set(key, request);
    return request;
};
