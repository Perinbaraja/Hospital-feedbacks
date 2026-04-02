import API from '../api.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = 'hospital-config-cache:';
const memoryCache = new Map();
const inflightRequests = new Map();

const normalizeValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const buildRequestKey = ({ hospitalId, qrId } = {}) => {
    const normalizedHospitalId = normalizeValue(hospitalId);
    const normalizedQrId = normalizeValue(qrId);

    if (normalizedQrId) return `qrId:${normalizedQrId}`;
    if (normalizedHospitalId) return `hospital:${normalizedHospitalId}`;
    return 'hospital:self';
};

const buildAliases = (hospital = {}) => {
    const keys = new Set();
    const id = normalizeValue(hospital._id);
    const hospitalId = normalizeValue(hospital.hospitalId);
    const uniqueId = normalizeValue(hospital.uniqueId);
    const qrId = normalizeValue(hospital.qrId);

    if (id) keys.add(`hospital:${id}`);
    if (hospitalId) keys.add(`hospital:${hospitalId}`);
    if (uniqueId) keys.add(`hospital:${uniqueId}`);
    if (qrId) keys.add(`qrId:${qrId}`);

    return [...keys];
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
        // Ignore storage quota or privacy mode issues.
    }
};

const deleteSessionCache = (key) => {
    try {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
        // Ignore storage errors during cleanup.
    }
};

export const setHospitalConfigCache = (hospital, { requestKey, ttlMs = DEFAULT_TTL_MS } = {}) => {
    if (!hospital) return hospital;

    const entry = {
        data: hospital,
        expiresAt: Date.now() + ttlMs
    };

    const keys = new Set([requestKey, ...buildAliases(hospital)].filter(Boolean));
    for (const key of keys) {
        memoryCache.set(key, entry);
        writeSessionCache(key, entry);
    }

    return hospital;
};

export const invalidateHospitalConfigCache = (hospitalOrKey) => {
    const keys = new Set();

    if (typeof hospitalOrKey === 'string') {
        keys.add(hospitalOrKey);
    } else {
        buildAliases(hospitalOrKey).forEach((key) => keys.add(key));
    }

    for (const key of keys) {
        memoryCache.delete(key);
        inflightRequests.delete(key);
        deleteSessionCache(key);
    }
};

export const clearHospitalConfigCache = () => {
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

export const getHospitalConfig = async (params = {}, options = {}) => {
    const { forceRefresh = false, ttlMs = DEFAULT_TTL_MS } = options;
    const requestKey = buildRequestKey(params);

    if (!forceRefresh) {
        const memoryEntry = memoryCache.get(requestKey);
        if (memoryEntry?.expiresAt > Date.now()) {
            return memoryEntry.data;
        }

        const sessionEntry = readSessionCache(requestKey);
        if (sessionEntry) {
            memoryCache.set(requestKey, sessionEntry);
            return sessionEntry.data;
        }
    }

    if (inflightRequests.has(requestKey)) {
        return inflightRequests.get(requestKey);
    }

    const query = new URLSearchParams();
    if (params.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params.qrId) query.set('qrId', params.qrId);
    const url = query.toString() ? `/hospital?${query.toString()}` : '/hospital';

    const request = API.get(url)
        .then(({ data }) => setHospitalConfigCache(data, { requestKey, ttlMs }))
        .finally(() => {
            inflightRequests.delete(requestKey);
        });

    inflightRequests.set(requestKey, request);
    return request;
};
