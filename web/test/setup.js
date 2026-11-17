import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Results and chat are lazy chunks, so allow for slow machines when waiting on them.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom lacks these browser APIs that the component library feature-detects.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
window.matchMedia ??= (query) => ({
  matches: false, media: query, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
});
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.scrollTo ??= () => {};
