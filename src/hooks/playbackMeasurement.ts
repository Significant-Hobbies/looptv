import { useCallback, useRef } from 'react';
import { trackActivated, trackCoreAction } from '@/lib/analytics';

interface PlaybackSelectionMeasurement<T> {
  video: T | null;
  reported: boolean;
}

function selectPlaybackForMeasurement<T>(
  state: PlaybackSelectionMeasurement<T>,
  video: T | null
): void {
  if (state.video === video) return;
  state.video = video;
  state.reported = false;
}

function reportConfirmedPlayback<T>(
  state: PlaybackSelectionMeasurement<T>,
  video: T | null,
  report: () => void
): boolean {
  if (!video || state.video !== video || state.reported) return false;
  state.reported = true;
  report();
  return true;
}

export function useConfirmedPlaybackMeasurement<T extends { id: string }>(
  video: T | null,
  clearIssue: (issue: null) => void
) {
  const state = useRef<PlaybackSelectionMeasurement<T>>({ video, reported: false });
  selectPlaybackForMeasurement(state.current, video);
  return useCallback(
    (videoId: string) => {
      if (!video || video.id !== videoId) return;
      clearIssue(null);
      reportConfirmedPlayback(state.current, video, () => {
        trackActivated();
        trackCoreAction('video_played');
      });
    },
    [video, clearIssue]
  );
}
