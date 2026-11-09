// Minimal Express-like req/res doubles for middleware unit tests.
function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        headers: {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        set(key, value) {
            if (typeof key === 'object') Object.assign(this.headers, key);
            else this.headers[key] = value;
            return this;
        }
    };
}

function fakeReq({ headers = {}, ip = '127.0.0.1', user } = {}) {
    return { ip, user, header: (name) => headers[name] ?? headers[name.toLowerCase()] };
}

module.exports = { fakeRes, fakeReq };
