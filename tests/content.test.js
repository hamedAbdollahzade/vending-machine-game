import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { COMPANY } from '../src/config/company.js';
import { strings } from '../src/i18n/fa.js';

const SRC = new URL('../src/', import.meta.url).pathname;
// Persian text may only live in the strings file, the company config, map data and the list of
// machine sites (place names and addresses are map content, not interface text).
const ALLOWED = ['i18n/', 'config/', 'data/', 'constants/locations.js'];
const PERSIAN = /[؀-ۿ]/;
// Persian digits used for number formatting, not text.
const DIGITS_ONLY = /^[۰-۹]$/;

/**
 * Lists source files below a folder.
 * @param {string} dir - Folder to walk.
 * @returns {string[]} File paths.
 */
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

/**
 * WCAG contrast ratio between two #rrggbb colours.
 * @param {string} a - First colour.
 * @param {string} b - Second colour.
 * @returns {number} Ratio from 1 to 21.
 */
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test('Interface text lives in the strings file, not in components or game code', () => {
  const offenders = sourceFiles(SRC)
    .map((path) => relative(SRC, path))
    .filter((path) => !ALLOWED.some((allowed) => path.startsWith(allowed)))
    .flatMap((path) =>
      readFileSync(join(SRC, path), 'utf8')
        .split('\n')
        .map((line, i) => [line, i + 1])
        .filter(([line]) => [...line].some((ch) => PERSIAN.test(ch) && !DIGITS_ONLY.test(ch)))
        .map(([, n]) => `${path}:${n}`),
    );
  assert.deepEqual(offenders, []);
});

test('Brand palette keeps readable contrast', () => {
  const c = COMPANY.colors;
  assert.equal(c.primary, '#00a693');
  assert.ok(contrast(c.primary, c.surface) >= 4.5, 'primary accents on dark surfaces');
  assert.ok(contrast(c.onPrimary, c.primary) >= 4.5, 'text on primary buttons');
  assert.ok(contrast(c.text, c.surface) >= 7, 'body text');
  assert.ok(contrast(c.textMuted, c.surface) >= 4.5, 'secondary text');
});

test('Strings that take values build complete sentences', () => {
  assert.equal(strings.prompts.getIn('بی‌ام‌و'), 'F · سوار بی‌ام‌و شو');
  assert.equal(strings.units.hetoman('۵۰۰'), '۵۰۰ هتومان');
  assert.ok(strings.briefing.subtitle.includes(COMPANY.shortName));
  assert.equal(strings.ranks.length, 6);
});
