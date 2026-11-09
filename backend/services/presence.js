// A unit is "online" when it has not been switched off and its device has
// pinged recently. The window is configurable for slow networks.
const ONLINE_WINDOW_MS = Number(process.env.UNIT_ONLINE_WINDOW_MS) || 60 * 1000;

function isOnline(resource, now = Date.now()) {
    if (!resource || resource.status === 'offline' || !resource.lastSeen) return false;
    return now - new Date(resource.lastSeen).getTime() <= ONLINE_WINDOW_MS;
}

module.exports = { isOnline, ONLINE_WINDOW_MS };
