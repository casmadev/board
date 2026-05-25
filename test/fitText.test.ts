import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { fitText, truncateToFit } from '../src/geometry/fitText';

/**
 * jsdom doesn't do real layout, so we monkey-patch `scrollHeight` /
 * `scrollWidth` to simulate an overflow-detection oracle: content "fits"
 * once the text length is below a threshold scaled by font-size.
 */
function makeMockElement(fitsAtLength: (chars: number, fontPx: number) => boolean) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
  Object.defineProperty(el, 'scrollWidth', {
    get: () => (fitsAtLength((el.textContent ?? '').length, parseFloat(el.style.fontSize || '16')) ? 100 : 1000),
    configurable: true,
  });
  Object.defineProperty(el, 'scrollHeight', {
    get: () => (fitsAtLength((el.textContent ?? '').length, parseFloat(el.style.fontSize || '16')) ? 100 : 1000),
    configurable: true,
  });
  document.body.appendChild(el);
  return el;
}

let el: HTMLElement;
afterEach(() => el?.remove());

describe('fitText', () => {
  it('returns max size when content already fits', () => {
    el = makeMockElement(() => true);
    el.textContent = 'short';
    expect(fitText(el, 32, 10)).toBe(32);
    expect(el.style.fontSize).toBe('32px');
  });

  it('shrinks down to min when content never fits', () => {
    el = makeMockElement(() => false);
    el.textContent = 'will never fit no matter the size';
    expect(fitText(el, 32, 10)).toBe(10);
    expect(el.style.fontSize).toBe('10px');
  });

  it('finds an intermediate size when content fits below some threshold', () => {
    el = makeMockElement((_chars, font) => font <= 20);
    el.textContent = 'medium length text';
    expect(fitText(el, 32, 10)).toBe(20);
  });
});

describe('truncateToFit', () => {
  it('leaves text alone when content fits', () => {
    el = makeMockElement(() => true);
    truncateToFit(el, 'fits perfectly');
    expect(el.textContent).toBe('fits perfectly');
  });

  it('truncates with ellipsis when content overflows', () => {
    // Fits only if length (with ellipsis) <= 10
    el = makeMockElement((chars) => chars <= 10);
    truncateToFit(el, 'this is a much longer string than fits');
    expect(el.textContent?.endsWith('…')).toBe(true);
    expect(el.textContent?.length).toBeLessThanOrEqual(10);
    // Should be the longest prefix that fits (length 10 with ellipsis)
    expect(el.textContent).toBe('this is a…');
  });

  it('uses a custom ellipsis when provided', () => {
    el = makeMockElement((chars) => chars <= 10);
    truncateToFit(el, 'longer than fits', '...');
    expect(el.textContent?.endsWith('...')).toBe(true);
  });
});
