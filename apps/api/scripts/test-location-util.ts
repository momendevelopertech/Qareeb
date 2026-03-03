import assert from 'node:assert/strict';
import {
    calculateDistance,
    extractCoordinatesFromUrl,
    generateGoogleMapsLink,
    validateCoordinates,
} from '../src/common/location.util';

const direct = extractCoordinatesFromUrl('https://www.google.com/maps?q=30.044420,31.235712');
assert.ok(direct, 'Expected coordinates from query URL');
assert.equal(direct?.lat, 30.04442);
assert.equal(direct?.lng, 31.235712);

const rounded = validateCoordinates({ lat: 30.044420123, lng: 31.235712891 });
assert.deepEqual(rounded, { lat: 30.04442, lng: 31.235713 });

const generatedLink = generateGoogleMapsLink({ lat: 30.04442, lng: 31.235712 });
assert.equal(generatedLink, 'https://www.google.com/maps?q=30.04442,31.235712');

const distanceMeters = calculateDistance(
    { lat: 30.04442, lng: 31.235712 },
    { lat: 30.050000, lng: 31.240000 },
);
assert.ok(Number.isFinite(distanceMeters) && distanceMeters > 0, 'Expected positive finite distance');

console.log('location.util test passed');
