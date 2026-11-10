// A unit is operated by a crew of one or more accounts. Each person goes on duty
// or off duty on their own; the unit is online while at least one person is on duty.
const User = require('../models/User');
const Resource = require('../models/Resource');
const { publishToDispatchers } = require('./events');
const { isOnline } = require('./presence');

// Everyone linked to the unit: [{ id, username, email, onDuty }].
async function crewOf(unitId) {
    const members = await User.find({ unit: unitId }).select('username email onDuty').sort({ username: 1 }).lean();
    return members.map((m) => ({ id: m._id, username: m.username, email: m.email, onDuty: Boolean(m.onDuty) }));
}

// Map of unit id -> crew array, for many units at once.
async function crewByUnit() {
    const members = await User.find({ unit: { $ne: null } }).select('username email onDuty unit').sort({ username: 1 }).lean();
    const map = new Map();
    for (const m of members) {
        const key = String(m.unit);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ id: m._id, username: m.username, email: m.email, onDuty: Boolean(m.onDuty) });
    }
    return map;
}

// Is anyone other than `exceptUserId` on duty for this unit?
async function othersOnDuty(unitId, exceptUserId = null) {
    const query = { unit: unitId, onDuty: true };
    if (exceptUserId) query._id = { $ne: exceptUserId };
    return Boolean(await User.exists(query));
}

// When the last person on duty leaves, an idle unit comes off the dispatch board.
// A unit on a dispatch is left as it is. Returns the updated unit, or null.
async function takeOfflineIfNobodyOnDuty(unitId) {
    if (await othersOnDuty(unitId)) return null;
    const offline = await Resource.findOneAndUpdate(
        { _id: unitId, status: 'available' },
        { $set: { status: 'offline', lastSeen: null } },
        { returnDocument: 'after' }
    );
    if (offline) publishToDispatchers('unit:status', { ...offline.toObject(), online: isOnline(offline) });
    return offline;
}

module.exports = { crewOf, crewByUnit, othersOnDuty, takeOfflineIfNobodyOnDuty };
