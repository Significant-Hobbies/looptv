import { createElement } from 'react';
import AppLink from '@/components/AppLink';
import FeaturesSection from '@/components/FeaturesSection';
import AboutPage, {
  AboutHero,
  HowItWorks,
  TipsSection,
  AddYourOwn,
  ClosingCta,
} from '@/react-pages/AboutPage';
import CatalogPage, { StationDetails } from '@/react-pages/CatalogPage';
import ChannelsPage from '@/react-pages/ChannelsPage';
import PrivacyPage from '@/react-pages/PrivacyPage';
import TermsPage from '@/react-pages/TermsPage';
import { reactSourceMarkdown } from './react-source-markdown';
import { PUBLIC_ORIGIN } from './public-surfaces';

const pages = {
  '/about': AboutPage,
  '/catalog': CatalogPage,
  '/channels': ChannelsPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
};
const components = [
  ...Object.values(pages),
  AppLink,
  FeaturesSection,
  AboutHero,
  HowItWorks,
  TipsSection,
  AddYourOwn,
  ClosingCta,
  StationDetails,
];

export function publicComponentMarkdown(path: string): string | undefined {
  const page = pages[path as keyof typeof pages];
  return page
    ? reactSourceMarkdown(createElement(page), { origin: PUBLIC_ORIGIN, components })
    : undefined;
}
