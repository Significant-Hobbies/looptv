import json from '@/content/home.json';
import stations from '../../channels.config';
import catalogSummary from '../../public/catalog-summary.json';

export function homeContent(): typeof json {
  const counts: Record<string, string> = {
    stationCount: stations.length.toLocaleString('en-US'),
    sourceCount: stations
      .reduce((total, station) => total + station.sources.length, 0)
      .toLocaleString('en-US'),
    videoCount: catalogSummary.totalVideos.toLocaleString('en-US'),
  };
  return JSON.parse(
    JSON.stringify(json).replace(
      /\{(stationCount|sourceCount|videoCount)\}/g,
      (_, key: string) => counts[key] ?? ''
    )
  );
}
