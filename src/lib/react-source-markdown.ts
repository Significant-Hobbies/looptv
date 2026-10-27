import { Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

type Props = Record<string, unknown> & { children?: ReactNode };
type SourceElement = ReactElement<Props>;
type PureComponent = (props: never) => ReactNode;
interface Options {
  origin: string;
  components: readonly PureComponent[];
}
interface Context extends Options {
  allowed: Set<PureComponent>;
  code: string[];
}

// Only reviewed, pure authored components are evaluated. No DOM or HTML parser,
// effects, browser state, or rendered-HTML roundtrip participates in this path.
export function reactSourceMarkdown(node: ReactNode, options: Options): string {
  const context: Context = { ...options, allowed: new Set(options.components), code: [] };
  let main = node;
  while (isSourceElement(main) && typeof main.type === 'function') {
    main = invoke(main.type as PureComponent, main.props, context);
  }
  if (!isValidElement(main) || main.type !== 'main')
    throw new Error('Public source must have one main root');
  return renderNode(main, context)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/\uE000CODE(\d+)\uE000/g, (_, index: string) => context.code[Number(index)] ?? '');
}

function isSourceElement(value: ReactNode): value is SourceElement {
  return isValidElement(value);
}

function invoke(component: PureComponent, props: Props, context: Context): ReactNode {
  if (!context.allowed.has(component))
    throw new Error(`Unreviewed public component: ${component.name}`);
  return component(props as never);
}

const markdownSymbols = new Set(['\\', '`', '*', '_', '[', ']', '#']);
function escapeText(value: string): string {
  return [...value]
    .map((character) => (markdownSymbols.has(character) ? `\\${character}` : character))
    .join('');
}

function renderNode(value: ReactNode, context: Context): string {
  if (value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return escapeText(String(value));
  if (Array.isArray(value)) return value.map((child) => renderNode(child, context)).join('');
  if (!isSourceElement(value)) throw new Error('Unsupported public source node');
  return renderElement(value, context);
}

function renderElement(value: SourceElement, context: Context): string {
  const { type, props } = value;
  if (excluded(props)) return '';
  if (type === Fragment) return renderNode(props.children, context);
  if (typeof type === 'function')
    return renderNode(invoke(type as PureComponent, props, context), context);
  if (typeof type !== 'string') throw new Error('Unsupported public component wrapper');
  if (['nav', 'footer'].includes(type)) return '';
  if (type === 'script' && props.type === 'application/ld+json') return '';
  if (props.dangerouslySetInnerHTML)
    throw new Error('Raw HTML is not a public source representation');
  if (type === 'pre' || type === 'code') return renderCode(type, props.children, context);
  return renderTag(type, props, (child) => renderNode(child, context), context.origin);
}

function renderCode(tag: string, node: ReactNode, context: Context): string {
  const source = plainCode(node);
  const fence = '`'.repeat(
    Math.max(
      tag === 'pre' ? 3 : 1,
      ...[...source.matchAll(/\x60+/g)].map((match) => match[0].length + 1)
    )
  );
  context.code.push(
    tag === 'pre' ? `\n\n${fence}\n${source}\n${fence}\n\n` : `${fence}${source}${fence}`
  );
  return `\uE000CODE${context.code.length - 1}\uE000`;
}

function excluded(props: Props): boolean {
  const style = props.style as { display?: string; visibility?: string } | undefined;
  return (
    props.hidden === true ||
    props['aria-hidden'] === true ||
    props['aria-hidden'] === 'true' ||
    style?.display === 'none' ||
    style?.visibility === 'hidden'
  );
}

const blocks = new Set([
  'main',
  'section',
  'article',
  'aside',
  'header',
  'div',
  'p',
  'details',
  'summary',
  'ul',
  'ol',
  'dl',
  'dt',
  'dd',
]);
const inline = new Set(['span', 'time', 'small', 'label', 'sup', 'sub']);
type Render = (node: ReactNode) => string;

function renderTag(tag: string, props: Props, render: Render, origin: string): string {
  if (tag === 'table') return renderTable(props.children, render);
  const body = render(props.children);
  if (blocks.has(tag)) return `\n\n${body.trim()}\n\n`;
  if (inline.has(tag)) return body;
  if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${body.trim()}\n\n`;
  if (tag === 'a')
    return `[${body.trim() || String(props['aria-label'] || '')}](${publicUrl(props.href, origin)})`;
  if (tag === 'img') return props.alt ? `![${props.alt}](${publicUrl(props.src, origin)})` : '';
  const decorated = decorations[tag];
  if (decorated) return decorated(body);
  throw new Error(`Unsupported public source element: ${tag}`);
}

const decorations: Record<string, (body: string) => string> = {
  li: (body) => `\n- ${body.trim()}\n`,
  br: () => '\n',
  hr: () => '\n\n---\n\n',
  strong: (body) => `**${body}**`,
  b: (body) => `**${body}**`,
  em: (body) => `*${body}*`,
  i: (body) => `*${body}*`,
};

function publicUrl(value: unknown, origin: string): string {
  if (typeof value !== 'string') throw new Error('Public source link has no URL');
  const url = new URL(value, origin);
  if (!['https:', 'http:', 'mailto:'].includes(url.protocol))
    throw new Error('Unsupported public source URL');
  return url.href;
}

function plainCode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainCode).join('');
  if (isSourceElement(node) && node.type === 'code') return plainCode(node.props.children);
  throw new Error('Unsupported public code source');
}

function renderTable(node: ReactNode, render: Render): string {
  const rows: { cells: string[]; header: boolean }[] = [];
  function visit(value: ReactNode) {
    if (value == null || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isSourceElement(value)) throw new Error('Unsupported table source');
    if (excluded(value.props)) return;
    if (['thead', 'tbody', 'tfoot'].includes(String(value.type))) {
      visit(value.props.children);
      return;
    }
    if (value.type !== 'tr') throw new Error('Unsupported table row source');
    const children = Array.isArray(value.props.children)
      ? value.props.children
      : [value.props.children];
    const cells = children.map((cell) => {
      if (!isSourceElement(cell) || !['td', 'th'].includes(String(cell.type)))
        throw new Error('Unsupported table cell source');
      return render(cell.props.children)
        .trim()
        .replaceAll('|', '\\|')
        .replace(/\s*\n\s*/g, ' ');
    });
    rows.push({
      cells,
      header: children.every((cell) => isValidElement(cell) && cell.type === 'th'),
    });
  }
  visit(node);
  if (!rows.length) return '';
  if (!rows[0]?.header) throw new Error('Public Markdown tables require authored headers');
  return `\n\n${rows.map((row, index) => `| ${row.cells.join(' | ')} |${index === 0 ? `\n| ${row.cells.map(() => '---').join(' | ')} |` : ''}`).join('\n')}\n\n`;
}
