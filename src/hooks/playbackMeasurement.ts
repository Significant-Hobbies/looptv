import { useRef } from 'react';
import { trackActivated, trackCoreAction } from '@/lib/analytics';

export interface PlaybackSelectionMeasurement<T> {
  video: T | null;
  reported: boolean;
}

export function usePlaybackSelectionMeasurement<T>(video: T | null) {
  const state = useRef<PlaybackSelectionMeasurement<T>>({ video, reported: false });
  selectPlaybackForMeasurement(state.current, video);
  return state;
}

export function selectPlaybackForMeasurement<T>(
  state: PlaybackSelectionMeasurement<T>,
  video: T | null
): void {
  if (state.video === video) return;
  state.video = video;
  state.reported = false;
}

export function reportConfirmedPlayback<T>(
  state: PlaybackSelectionMeasurement<T>,
  video: T | null,
  report: () => void
): boolean {
  if (!video || state.video !== video || state.reported) return false;
  state.reported = true;
  report();
  return true;
}

export function reportConfirmedVideoPlayback<T extends { id: string }>(
  state: PlaybackSelectionMeasurement<T>,
  video: T | null,
  videoId: string,
  clearIssue: () => void
): void {
  if (!video || video.id !== videoId) return;
  clearIssue();
  reportConfirmedPlayback(state, video, () => {
    trackActivated();
    trackCoreAction('video_played');
  });
}
