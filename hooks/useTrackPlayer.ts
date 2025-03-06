import { useEffect, useState } from 'react';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability, Event, RepeatMode, State } from 'react-native-track-player';

export const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 2,
    });

    return true;
  } catch (error) {
    console.error('Error setting up track player:', error);
    return false;
  }
};

export const useTrackPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setupPlayer();

    return () => {
      TrackPlayer.reset();
    };
  }, []);

  const loadAudio = async (audioUri: string, playbackSpeed: number = 1.0) => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        url: audioUri,
        title: 'Study Guide Audio',
        artist: 'SchoolKompass',
        duration: 0, // Will be updated when loaded
      });
      await TrackPlayer.setRate(playbackSpeed);
      
      const trackDuration = await TrackPlayer.getDuration();
      setDuration(trackDuration * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const playPauseAudio = async () => {
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
    }
  };

  const seekAudio = async (value: number) => {
    try {
      await TrackPlayer.seekTo(value / 1000); // Convert from milliseconds to seconds
      setPosition(value);
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const setSpeed = async (speed: number) => {
    try {
      await TrackPlayer.setRate(speed);
    } catch (error) {
      console.error('Error setting playback speed:', error);
    }
  };

  useEffect(() => {
    let progressSubscription: any;

    const setupProgressListener = async () => {
      progressSubscription = await TrackPlayer.addEventListener(
        Event.PlaybackProgressUpdated,
        (data) => {
          setPosition(data.position * 1000); // Convert to milliseconds
        }
      );
    };

    setupProgressListener();

    return () => {
      if (progressSubscription) {
        progressSubscription.remove();
      }
    };
  }, []);

  return {
    isPlaying,
    position,
    duration,
    loadAudio,
    playPauseAudio,
    seekAudio,
    setSpeed,
  };
};