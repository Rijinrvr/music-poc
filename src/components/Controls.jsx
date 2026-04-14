import React from 'react';
import { usePlayer } from '../context/PlayerContext';

// ==========================================
// Controls Component (used inside PlayerBar)
// ==========================================

export default function Controls() {
  const { state, dispatch, playPause, playNext, playPrev, seek } = usePlayer();
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffling,
    repeatMode,
    currentSong,
  } = state;

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    seek(newTime);
  };

  const handleVolumeChange = (e) => {
    dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) });
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.4) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') return '🔂';
    return '🔁';
  };

  return (
    <>
      {/* Main Controls Row */}
      <div className="player-controls">
        {/* Shuffle */}
        <button
          id="shuffle-btn"
          className={`ctrl-btn small ${isShuffling ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
          aria-label="Shuffle"
          aria-pressed={isShuffling}
          title="Shuffle"
        >
          🔀
        </button>

        {/* Previous */}
        <button
          id="prev-btn"
          className="ctrl-btn large"
          onClick={playPrev}
          disabled={!currentSong}
          aria-label="Previous track"
          title="Previous"
        >
          ⏮
        </button>

        {/* Play / Pause */}
        <button
          id="play-pause-btn"
          className="play-pause-btn"
          onClick={playPause}
          disabled={!currentSong}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Next */}
        <button
          id="next-btn"
          className="ctrl-btn large"
          onClick={playNext}
          disabled={!currentSong}
          aria-label="Next track"
          title="Next"
        >
          ⏭
        </button>

        {/* Repeat */}
        <button
          id="repeat-btn"
          className={`ctrl-btn small ${repeatMode !== 'none' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'CYCLE_REPEAT' })}
          aria-label={`Repeat: ${repeatMode}`}
          title={`Repeat: ${repeatMode}`}
        >
          {getRepeatIcon()}
        </button>
      </div>

      {/* Progress Bar Row */}
      <div className="progress-section">
        <span className="time-label" aria-label={`Current time: ${formatTime(currentTime)}`}>
          {formatTime(currentTime)}
        </span>

        <div className="progress-bar-wrapper" role="group" aria-label="Seek bar">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              <div className="progress-thumb" aria-hidden="true" />
            </div>
          </div>
          <input
            id="seek-slider"
            type="range"
            className="progress-input"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleProgressChange}
            disabled={!currentSong || duration === 0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          />
        </div>

        <span className="time-label" aria-label={`Duration: ${formatTime(duration)}`}>
          {formatTime(duration)}
        </span>
      </div>
    </>
  );
}

// ==========================================
// Volume Control (exported separately)
// ==========================================

export function VolumeControl() {
  const { state, dispatch } = usePlayer();
  const { volume, isMuted } = state;

  const handleVolumeChange = (e) => {
    dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) });
  };

  const toggleMute = () => dispatch({ type: 'TOGGLE_MUTE' });

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.4) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  const displayVolume = isMuted ? 0 : volume;

  return (
    <>
      <button
        id="mute-btn"
        className="volume-icon"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        {getVolumeIcon()}
      </button>

      <div className="volume-slider-wrapper">
        <div className="volume-track">
          <div className="volume-fill" style={{ width: `${displayVolume * 100}%` }} />
        </div>
        <input
          id="volume-slider"
          type="range"
          className="volume-input"
          min="0"
          max="1"
          step="0.02"
          value={displayVolume}
          onChange={handleVolumeChange}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayVolume * 100)}
        />
      </div>
    </>
  );
}
