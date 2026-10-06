import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement these DOM APIs; several pages call them (auto-scroll, charts, etc.)
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
}));
