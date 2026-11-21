import axe from 'axe-core';

/** Run axe on a DOM node and return readable violations. Colour contrast is skipped: jsdom has no layout engine. */
export async function accessibilityViolations(node) {
  const { violations } = await axe.run(node, { rules: { 'color-contrast': { enabled: false } } });
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
