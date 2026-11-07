// Generic route lookup, available to any signed-in user (dispatchers use it to
// preview a response before dispatching). Mounted at /api/route.
const express = require('express');
const { getRoute } = require('../services/routing');

const router = express.Router();

function parseCoordinate(value, min, max) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

router.get('/', async (req, res) => {
    const from = { lat: parseCoordinate(req.query.fromLat, -90, 90), lng: parseCoordinate(req.query.fromLng, -180, 180) };
    const to = { lat: parseCoordinate(req.query.toLat, -90, 90), lng: parseCoordinate(req.query.toLng, -180, 180) };
    if ([from.lat, from.lng, to.lat, to.lng].includes(null)) {
        return res.status(400).json({ message: 'fromLat, fromLng, toLat and toLng are required decimal degrees.' });
    }
    const route = await getRoute(from, to);
    return res.json({ ...route, from, to });
});

module.exports = router;
