const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two decimal-degree points. */
function haversineKm(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Returns the given units with a distanceKm field, nearest first.
 * Each unit needs numeric latitude/longitude.
 */
function rankByDistance(units, latitude, longitude) {
    return units
        .map((unit) => ({
            ...unit,
            distanceKm: Math.round(haversineKm(latitude, longitude, unit.latitude, unit.longitude) * 100) / 100
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { haversineKm, rankByDistance };
