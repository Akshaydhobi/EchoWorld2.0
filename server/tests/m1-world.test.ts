import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_BUILDING_TYPES } from '../config/constants.ts';
import { SeededRandom } from '../engine/prng.ts';
import { buildEchoCityWorld } from '../engine/WorldBuilder.ts';

test('SeededRandom generates identical sequences for the same seed and supports state restoration', () => {
  const rngA = new SeededRandom(2026);
  const rngB = new SeededRandom(2026);

  const seqA = [rngA.next(), rngA.next(), rngA.nextInt(1, 100)];
  const seqB = [rngB.next(), rngB.next(), rngB.nextInt(1, 100)];

  assert.deepEqual(seqA, seqB);

  const savedState = rngA.getState();
  const nextExpected = rngA.next();

  const rngRestored = new SeededRandom(1);
  rngRestored.setState(savedState);
  assert.equal(rngRestored.next(), nextExpected);
});

test('WorldBuilder creates ECHO CITY with 3 communities and all 10 required building types', () => {
  const world = buildEchoCityWorld({ seed: 2026 });

  assert.equal(world.name, 'ECHO CITY');
  assert.equal(world.communities.length, 3);

  const communityIds = world.communities.map((c) => c.id);
  assert.deepEqual(communityIds, ['greenfield', 'metrocore', 'novadistrict']);

  const totalTargetPop = world.communities.reduce(
    (sum, community) => sum + community.targetInitialPopulation,
    0,
  );
  assert.equal(totalTargetPop, 30);

  const presentBuildingTypes = new Set(
    world.communities.flatMap((c) => c.buildings.map((b) => b.type)),
  );

  for (const requiredType of REQUIRED_BUILDING_TYPES) {
    assert.equal(
      presentBuildingTypes.has(requiredType),
      true,
      `Missing required facility type: ${requiredType}`,
    );
  }
});
