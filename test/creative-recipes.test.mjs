import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const { buildCreativeTokens } = await import(
  pathToFileURL(join(dist, 'services', 'creativeTokens.js')).href
);
const { buildDesignRecipe, buildRecipeOptions, RECIPE_CONCEPTS } = await import(
  pathToFileURL(join(dist, 'services', 'creativeRecipes.js')).href
);
const { loadPreset } = await import(pathToFileURL(join(dist, 'services', 'presetLoader.js')).href);

const tokens = buildCreativeTokens(await loadPreset('glassmorphic-base'));

test('a menu brief chooses the printed ledger direction', () => {
  const recipe = buildDesignRecipe(tokens, {
    goal: 'autumn menu for a neighbourhood bakery',
    deliverable: 'menu',
    seed: 'bakery'
  });
  assert.equal(recipe.look.template, 'ledger');
  assert.equal(recipe.deliverable.id, 'menu');
  assert.ok(recipe.grid.columns >= 6);
  assert.ok(recipe.grid.baseline > 0);
  assert.ok(recipe.hierarchy.some((slot) => slot.role === 'offer'));
  assert.ok(recipe.copyRules.length >= 5);
  assert.ok(recipe.avoid.length >= 5);
});

test('a discount brief chooses the ticket direction', () => {
  const recipe = buildDesignRecipe(tokens, {
    goal: '20% off first order coupon',
    deliverable: 'coupon',
    seed: 'offer'
  });
  assert.equal(recipe.look.template, 'ticket');
  assert.equal(recipe.deliverable.id, 'coupon');
  assert.ok(recipe.devices.some((device) => device.includes('stub')));
});

test('an event brief chooses the marquee direction and stays in the safe zone', () => {
  const recipe = buildDesignRecipe(tokens, {
    goal: 'late summer warehouse party with live music',
    deliverable: 'event-poster',
    seed: 'party'
  });
  assert.equal(recipe.look.template, 'marquee');
  assert.equal(recipe.grid.safeTop, 0);
});

test('recipes are deterministic for the same brief and seed', () => {
  const input = { goal: 'premium skincare launch', deliverable: 'poster', seed: 'skincare' };
  assert.equal(JSON.stringify(buildDesignRecipe(tokens, input)), JSON.stringify(buildDesignRecipe(tokens, input)));
});

test('alternates are distinct and every recipe names real tokens', () => {
  const recipes = buildRecipeOptions(tokens, {
    goal: 'premium skincare launch',
    deliverable: 'poster',
    seed: 'skincare'
  });
  assert.ok(recipes.length >= 3);
  assert.equal(new Set(recipes.map((r) => r.look.id)).size, recipes.length);
  const palettes = new Set(tokens.palettes.map((p) => p.id));
  const fonts = new Set(tokens.typePairings.map((p) => p.displayFont));
  for (const recipe of recipes) {
    assert.ok(palettes.has(recipe.palette.id));
    assert.ok(fonts.has(recipe.pairing.displayFont));
    assert.ok(recipe.hierarchy.every((slot) => slot.maxLines > 0));
  }
});

test('all concepts are discoverable', () => {
  assert.ok(RECIPE_CONCEPTS.length >= 8);
  assert.equal(new Set(RECIPE_CONCEPTS.map((c) => c.id)).size, RECIPE_CONCEPTS.length);
  for (const concept of RECIPE_CONCEPTS) {
    assert.ok(tokens.looks.some((look) => concept.looks.includes(look.id)), `${concept.id} has a look`);
  }
});
