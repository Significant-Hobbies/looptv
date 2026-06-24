import type { Metadata } from 'next';
import TVApp from '@/components/TVApp';
import stations from '../../../channels.config';
import { notFound } from 'next/navigation';

export const dynamicParams = false;

export function generateStaticParams() {
  return stations.map((s) => ({ channel: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channel: string }>;
}): Promise<Metadata> {
  const { channel } = await params;
  const st = stations.find((s) => s.id === channel);
  if (!st) return { title: 'LoopTV' };

  return {
    title: st.name,
    description: st.description,
    openGraph: {
      title: `${st.name} | LoopTV`,
      description: st.description,
      url: `/${st.id}`,
      siteName: 'LoopTV',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${st.name} | LoopTV`,
      description: st.description,
    },
  };
}

export default async function ChannelPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  if (!stations.find((s) => s.id === channel)) notFound();
  return <TVApp initialChannel={channel} />;
}
