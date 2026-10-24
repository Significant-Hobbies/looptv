export interface PlaybackSelectionMeasurement<T> {
  video: T | null;
  reported: boolean;
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
