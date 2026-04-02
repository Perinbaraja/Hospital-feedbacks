import API from '../api.js';

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const STORAGE_PREFIX = 'admin-dashboard-cache:';
const memoryCache = new Map();
const inflightRequests = new Map();

const normalizeValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const buildDashboardKey = ({ hospitalId } = {}) => {
    const normalizedHospitalId = normalizeValue(hospitalId);
    return normalizedHospitalId ? `hospital:${normalizedHospitalId}` : 'hospital:self';
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

export const getCachedAdminDashboard = ({ hospitalId } = {}) => {
    const key = buildDashboardKey({ hospitalId });
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

export const setCachedAdminDashboard = (data, { hospitalId, ttlMs = DASHBOARD_CACHE_TTL_MS } = {}) => {
    const key = buildDashboardKey({ hospitalId });
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

export const fetchAdminDashboard = async ({ hospitalId } = {}, { forceRefresh = false, ttlMs = DASHBOARD_CACHE_TTL_MS } = {}) => {
    const key = buildDashboardKey({ hospitalId });

    if (!forceRefresh) {
        const cached = getCachedAdminDashboard({ hospitalId });
        if (cached) {
            return cached;
        }
    }

    if (inflightRequests.has(key)) {
        return inflightRequests.get(key);
    }

    const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    const request = API.get(`/admin/dashboard${query}`)
        .then(({ data }) => setCachedAdminDashboard(data, { hospitalId, ttlMs }))
        .finally(() => {
            inflightRequests.delete(key);
        });

    inflightRequests.set(key, request);
    return request;
};
