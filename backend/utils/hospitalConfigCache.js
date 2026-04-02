const HOSPITAL_CONFIG_CACHE_TTL_MS = 30 * 1000;
const hospitalConfigCache = new Map();

const normalizeValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const toPlainObject = (hospital) => {
    if (!hospital) return null;
    if (typeof hospital.toObject === 'function') {
        return hospital.toObject();
    }
    return { ...hospital };
};

const getCacheKeys = (hospital) => {
    const plainHospital = toPlainObject(hospital);
    if (!plainHospital) return [];

    const keys = new Set();
    const id = normalizeValue(plainHospital._id);
    const hospitalId = normalizeValue(plainHospital.hospitalId);
    const uniqueId = normalizeValue(plainHospital.uniqueId);
    const qrId = normalizeValue(plainHospital.qrId);

    if (id) keys.add(`id:${id}`);
    if (hospitalId) keys.add(`hospitalId:${hospitalId}`);
    if (uniqueId) keys.add(`uniqueId:${uniqueId}`);
    if (qrId) keys.add(`qrId:${qrId}`);

    return [...keys];
};

export const getCachedHospitalConfig = ({ hospitalId, qrId } = {}) => {
    const candidates = [];
    const normalizedHospitalId = normalizeValue(hospitalId);
    const normalizedQrId = normalizeValue(qrId);

    if (normalizedQrId) {
        candidates.push(`qrId:${normalizedQrId}`);
    }

    if (normalizedHospitalId) {
        candidates.push(`id:${normalizedHospitalId}`);
        candidates.push(`hospitalId:${normalizedHospitalId}`);
        candidates.push(`uniqueId:${normalizedHospitalId}`);
    }

    for (const key of candidates) {
        const entry = hospitalConfigCache.get(key);
        if (!entry) continue;

        if (entry.expiresAt <= Date.now()) {
            hospitalConfigCache.delete(key);
            continue;
        }

        return entry.value;
    }

    return null;
};

export const cacheHospitalConfig = (hospital, ttlMs = HOSPITAL_CONFIG_CACHE_TTL_MS) => {
    const plainHospital = toPlainObject(hospital);
    const cacheKeys = getCacheKeys(plainHospital);

    if (!plainHospital || cacheKeys.length === 0) {
        return plainHospital;
    }

    const entry = {
        value: plainHospital,
        expiresAt: Date.now() + ttlMs
    };

    for (const key of cacheKeys) {
        hospitalConfigCache.set(key, entry);
    }

    return plainHospital;
};

export const invalidateHospitalConfigCache = (hospital) => {
    const cacheKeys = getCacheKeys(hospital);
    for (const key of cacheKeys) {
        hospitalConfigCache.delete(key);
    }
};

