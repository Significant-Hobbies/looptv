import { studioFromProjects, studioProjectsFeed } from '@saas-maker/ui/blocks/footer';
import { createElement } from 'react';
import home from '@/content/home.json';

// Resolve once per build so every page shares the home page's studio strip.
// The checked-in snapshot also keeps offline builds useful.
const projects = await fetch(studioProjectsFeed, { signal: AbortSignal.timeout(1000) })
  .then((response) => (response.ok ? response.json() : []))
  .catch(() => home.footer.studio.map(({ id, label, href }) => ({ id, name: label, url: href })));

export const footerContent = {
  ...home.footer,
  studio: studioFromProjects(projects, { current: home.footer.catalogId }),
};

export const footerProps = {
  ...footerContent,
  product: home.product,
  url: home.url,
  mark: createElement('img', {
    src: home.mark,
    alt: '',
    width: 26,
    height: 26,
    className: 'size-[1.625rem] rounded-[0.45rem]',
  }),
  capture: 'newsletter' as const,
  variant: 'gallery' as const,
  groups: [{ title: 'Links', links: footerContent.links }],
};
