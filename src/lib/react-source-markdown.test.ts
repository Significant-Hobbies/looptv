import { createElement as el, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { reactSourceMarkdown } from './react-source-markdown';

const schemaFixture = { type: 'application/ld+json', dangerouslySetInnerHTML: { __html: '{}' } };
const rejectedHtmlFixture = { key: 'raw-html', dangerouslySetInnerHTML: { __html: '<p>x</p>' } };
const rejectedUrlFixture = { key: 'unsafe-url', href: 'javascript:alert(1)' };
const options = { origin: 'https://example.com', components: [] };
describe('reviewed React public source renderer', () => {
  it('preserves headings, links, lists, tables and exact code whitespace', () => {
    const source = el(
      'main',
      null,
      el('h1', null, 'A source page'),
      el('p', null, 'Read ', el('a', { href: '/guide' }, 'the guide'), '.'),
      el('ul', null, el('li', null, 'First'), el('li', null, 'Second')),
      el(
        'table',
        null,
        el('thead', null, el('tr', null, el('th', null, 'Name'), el('th', null, 'Value'))),
        el('tbody', null, el('tr', null, el('td', null, 'Example'), el('td', null, 'one | two')))
      ),
      el('pre', null, el('code', null, 'if (ready) {\n  run();\n\n\n}\n')),
      el('p', null, el('code', null, 'a`b'))
    );
    const markdown = reactSourceMarkdown(source, options);
    expect(markdown).toContain('# A source page');
    expect(markdown).toContain('[the guide](https://example.com/guide)');
    expect(markdown).toContain('- First\n\n- Second');
    expect(markdown).toContain('| Name | Value |\n| --- | --- |\n| Example | one \\| two |');
    expect(markdown).toContain('```\nif (ready) {\n  run();\n\n\n}\n\n```');
    expect(markdown).toContain('``a`b``');
  });

  it('keeps source punctuation literal instead of creating Markdown structure', () => {
    expect(
      reactSourceMarkdown(el('main', null, el('p', null, '# literal *text* [label]')), options)
    ).toBe(String.raw`\# literal \*text\* \[label\]`);
  });

  it('excludes chrome, hidden content and schema without evaluating hidden components', () => {
    const hidden = (_props: { hidden?: boolean }) => {
      throw new Error('must not execute');
    };
    const source = el(
      'main',
      null,
      el('p', null, 'Public copy'),
      el('nav', null, 'Navigation'),
      el('footer', null, 'Footer'),
      el('p', { hidden: true }, 'Hidden'),
      el('p', { 'aria-hidden': true }, 'Decorative'),
      el(hidden, { hidden: true }),
      el('script', schemaFixture)
    );
    expect(reactSourceMarkdown(source, options)).toBe('Public copy');
  });

  it('fails closed for unknown components, HTML, unsafe URLs and unsupported elements', () => {
    const unknown = () => el('p', null, 'Unknown');
    for (const source of [
      el(unknown, { key: 'unknown' }),
      el('iframe', { key: 'iframe' }),
      el('div', rejectedHtmlFixture),
      el('a', rejectedUrlFixture, 'Bad'),
    ]) {
      expect(() => reactSourceMarkdown(el('main', null, source), options)).toThrow();
    }
    expect(() => reactSourceMarkdown(el('div', null, 'Not main'), options)).toThrow(/main root/);
  });

  it('rejects hooks even if a previously reviewed component becomes stateful', () => {
    function Stateful() {
      useState(0);
      return el('main', null, 'Private state');
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() =>
        reactSourceMarkdown(el(Stateful), { ...options, components: [Stateful] })
      ).toThrow();
    } finally {
      consoleError.mockRestore();
    }
  });
});
