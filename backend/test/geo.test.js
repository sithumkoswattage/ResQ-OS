const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm, rankByDistance } = require('../services/geo');

test('distance between identical points is zero', () => {
    assert.equal(haversineKm(6.9271, 79.8612, 6.9271, 79.8612), 0);
});

test('Colombo Fort to Mount Lavinia is roughly 10 km', () => {
    const km = haversineKm(6.9344, 79.8428, 6.8389, 79.8636);
    assert.ok(km > 9.5 && km < 11.5, `got ${km}`);
});

test('rankByDistance sorts nearest first and adds distanceKm', () => {
    const ranked = rankByDistance([
        { unitCode: 'FAR', latitude: 7.2906, longitude: 80.6337 },
        { unitCode: 'NEAR', latitude: 6.93, longitude: 79.86 },
        { unitCode: 'MID', latitude: 6.5854, longitude: 79.9607 }
    ], 6.9271, 79.8612);
    assert.deepEqual(ranked.map((u) => u.unitCode), ['NEAR', 'MID', 'FAR']);
    assert.equal(typeof ranked[0].distanceKm, 'number');
});
