/**
 * Shrink the inline font-size of `el` until its content fits inside its
 * client box (no horizontal or vertical overflow). Mutates `el.style.fontSize`
 * and returns the resolved size in pixels.
 *
 * Assumes `el` already has fixed client width/height (set via CSS or inline)
 * and a wrapping rule like `white-space: pre-wrap; overflow-wrap: anywhere`.
 */
export function fitText(
  el: HTMLElement,
  maxFontSize: number,
  minFontSize: number,
): number {
  let size = Math.max(minFontSize, maxFontSize);
  el.style.fontSize = `${size}px`;
  while (
    size > minFontSize &&
    (el.scrollHeight > el.clientHeight + 1 ||
      el.scrollWidth > el.clientWidth + 1)
  ) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  return size;
}

/**
 * Replace `el.textContent` with the longest prefix of `full` that fits inside
 * the element's client box, followed by `ellipsis`. If the text already fits,
 * `full` is rendered unchanged. Uses binary search over character count.
 *
 * Assumes the element has fixed client width/height and a wrapping rule.
 * The browser's native `-webkit-line-clamp` is unreliable across engines and
 * is being phased out; this works in any browser that supports the basic CSS
 * box model.
 */
export function truncateToFit(
  el: HTMLElement,
  full: string,
  ellipsis = '…',
): void {
  el.textContent = full;
  if (
    el.scrollHeight <= el.clientHeight + 1 &&
    el.scrollWidth <= el.clientWidth + 1
  ) {
    return;
  }

  // Binary search: largest prefix length where prefix+ellipsis fits.
  let lo = 0;
  let hi = full.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    el.textContent = full.slice(0, mid).trimEnd() + ellipsis;
    const fits =
      el.scrollHeight <= el.clientHeight + 1 &&
      el.scrollWidth <= el.clientWidth + 1;
    if (fits) lo = mid;
    else hi = mid - 1;
  }
  el.textContent = full.slice(0, lo).trimEnd() + ellipsis;
}
