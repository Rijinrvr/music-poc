import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import Controls, { VolumeControl } from './Controls';

// ==========================================
// Player Bar Component
// ==========================================

export default function Player() {
  const { state, dispatch } = usePlayer();
  const { currentSong, isPlaying, likedSongs } = state;
  const [imgError, setImgError] = useState(false);

  if (!currentSong) return null;

  const isLiked = likedSongs.has(currentSong.id);

  return (
    <footer className="player-bar slide-up" role="region" aria-label="Music Player">
      {/* Left – Song Info */}
      <div className="player-song-info">
        <img
          src={imgError ? `https://picsum.photos/seed/${currentSong.id}/300/300` : currentSong.image}
          alt={`${currentSong.name} album cover`}
          className={`player-thumbnail ${isPlaying ? 'playing' : ''}`}
          onError={() => setImgError(true)}
          id="player-album-art"
        />
        <div className="player-song-text">
          <div className="player-song-title" title={currentSong.name}>
            {currentSong.name}
          </div>
          <div className="player-song-artist" title={currentSong.artist_name}>
            {currentSong.artist_name}
          </div>
        </div>
        <button
          id="like-btn"
          className={`player-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_LIKE', payload: currentSong.id })}
          aria-label={isLiked ? 'Unlike song' : 'Like song'}
          aria-pressed={isLiked}
          title={isLiked ? 'Remove from liked' : 'Add to liked'}
        >
          {isLiked ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Center – Controls + Progress */}
      <div className="player-center">
        <Controls />
      </div>

      {/* Right – Volume */}
      <div className="player-right">
        <VolumeControl />
      </div>
    </footer>
  );
}
