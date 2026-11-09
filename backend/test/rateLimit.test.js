const test = require('node:test');
const assert = require('node:assert/strict');
const { fakeReq, fakeRes } = require('./helpers');
const { createRateLimiter } = require('../middleware/rateLimit');

test('blocks after max hits and recovers after the window', () => {
    let clock = 1_000;
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => clock });
    const hit = (ip = '1.1.1.1') => {
        const res = fakeRes();
        let passed = false;
        limiter(fakeReq({ ip }), res, () => { passed = true; });
        return { res, passed };
    };

    assert.equal(hit().passed, true);
    assert.equal(hit().passed, true);
    const blocked = hit();
    assert.equal(blocked.passed, false);
    assert.equal(blocked.res.statusCode, 429);
    assert.ok(Number(blocked.res.headers['Retry-After']) >= 1);

    assert.equal(hit('2.2.2.2').passed, true, 'other clients are unaffected');
    clock += 1001;
    assert.equal(hit().passed, true, 'window reset');
    limiter.reset();
});
