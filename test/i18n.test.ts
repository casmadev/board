import { describe, expect, it } from 'vitest';
import { defaultMessages, mergeMessages } from '../src/i18n';
import { es } from '../src/locales/es';

describe('mergeMessages', () => {
  it('returns base when no override is given', () => {
    expect(mergeMessages(defaultMessages)).toBe(defaultMessages);
  });

  it('shallow-merges sections, preserving missing keys from base', () => {
    const merged = mergeMessages(defaultMessages, {
      toolbar: { delete: 'X' },
    });
    expect(merged.toolbar.delete).toBe('X');
    expect(merged.toolbar.select).toBe(defaultMessages.toolbar.select);
    expect(merged.colors).toEqual(defaultMessages.colors);
  });

  it('accepts a full localized Messages object', () => {
    const merged = mergeMessages(defaultMessages, es);
    expect(merged.toolbar.stickyNote).toBe('Nota adhesiva');
    expect(merged.colors.yellow).toBe('Amarillo');
  });
});
