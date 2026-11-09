const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { fakeReq, fakeRes } = require('./helpers');

process.env.JWT_SECRET = 'unit-test-secret-0123456789';
const { verifyToken, requireRole } = require('../middleware/auth');

function run(middleware, req) {
    const res = fakeRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

test('missing Authorization header is 401', () => {
    const { res, nextCalled } = run(verifyToken, fakeReq());
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('garbage token is 401 token_invalid (not 400)', () => {
    const { res } = run(verifyToken, fakeReq({ headers: { Authorization: 'Bearer nope' } }));
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'token_invalid');
});

test('expired token is 401 token_expired', () => {
    const token = jwt.sign({ id: '1', role: 'dispatcher' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const { res } = run(verifyToken, fakeReq({ headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'token_expired');
});

test('token signed with another secret is rejected', () => {
    const token = jwt.sign({ id: '1', role: 'dispatcher' }, 'some-other-secret-value');
    const { res } = run(verifyToken, fakeReq({ headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(res.statusCode, 401);
});

test('valid token passes and sets req.user', () => {
    const token = jwt.sign({ id: '1', role: 'dispatcher' }, process.env.JWT_SECRET);
    const req = fakeReq({ headers: { Authorization: `Bearer ${token}` } });
    const { nextCalled } = run(verifyToken, req);
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'dispatcher');
});

test('requireRole is 403 for the wrong role and when unauthenticated', () => {
    assert.equal(run(requireRole('dispatcher'), fakeReq({ user: { role: 'responder' } })).res.statusCode, 403);
    assert.equal(run(requireRole('dispatcher'), fakeReq()).res.statusCode, 403);
    assert.equal(run(requireRole('dispatcher'), fakeReq({ user: { role: 'dispatcher' } })).nextCalled, true);
});
