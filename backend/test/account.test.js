const test = require('node:test');
const assert = require('node:assert/strict');
const { fakeReq, fakeRes } = require('./helpers');
const { createAccountGuard } = require('../middleware/account');
const { requireRole } = require('../middleware/auth');

async function run(guard, req) {
    const res = fakeRes();
    let nextCalled = false;
    let nextError;
    await guard(req, res, (error) => { nextCalled = true; nextError = error; });
    return { res, nextCalled, nextError };
}

test('suspended accounts are blocked with account_suspended', async () => {
    const guard = createAccountGuard({ findUser: async () => ({ role: 'dispatcher', username: 'd', suspended: true }) });
    const { res, nextCalled } = await run(guard, fakeReq({ user: { id: '1', role: 'dispatcher' } }));
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'account_suspended');
    assert.equal(nextCalled, false);
});

test('deleted accounts get 401', async () => {
    const guard = createAccountGuard({ findUser: async () => null });
    const { res } = await run(guard, fakeReq({ user: { id: '1', role: 'admin' } }));
    assert.equal(res.statusCode, 401);
});

test('the current database role replaces a stale role in the token', async () => {
    const guard = createAccountGuard({ findUser: async () => ({ role: 'responder', username: 'now', suspended: false }) });
    const req = fakeReq({ user: { id: '1', role: 'admin', username: 'old' } });
    const { nextCalled } = await run(guard, req);
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'responder');
    assert.equal(req.user.username, 'now');
    // ...so an ex-admin no longer passes the admin check
    assert.equal((await run(requireRole('admin'), req)).res.statusCode, 403);
});

test('lookup failures are passed to the error handler', async () => {
    const boom = new Error('db down');
    const guard = createAccountGuard({ findUser: async () => { throw boom; } });
    const { nextError } = await run(guard, fakeReq({ user: { id: '1' } }));
    assert.equal(nextError, boom);
});

test('requireRole accepts several roles', async () => {
    const staff = requireRole('dispatcher', 'admin');
    assert.equal((await run(staff, fakeReq({ user: { role: 'admin' } }))).nextCalled, true);
    assert.equal((await run(staff, fakeReq({ user: { role: 'dispatcher' } }))).nextCalled, true);
    assert.equal((await run(staff, fakeReq({ user: { role: 'responder' } }))).res.statusCode, 403);
});
