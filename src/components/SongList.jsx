import React, { useState, memo } from 'react';
import { usePlayer } from '../context/PlayerContext';

// ==========================================
// Skeleton Loader
// ==========================================

function SkeletonList() {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading songs">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-num" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton skeleton-img" />
            <div className="skeleton-text">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-artist" />
            </div>
          </div>
          <div className="skeleton skeleton-album" />
          <div className="skeleton skeleton-dur" />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Song Row
// ==========================================

const SongRow = memo(function SongRow({ song, index, isActive, isPlaying }) {
  const { playSong } = usePlayer();
  const [imgError, setImgError] = useState(false);

  const formatDuration = (secs) => {
    if (!secs) return '--:--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      id={`song-row-${song.id}`}
      className={`song-card fade-in ${isActive ? 'active' : ''}`}
      onClick={() => playSong(song, index)}
      role="button"
      tabIndex={0}
      aria-label={`Play ${song.name} by ${song.artist_name}`}
      aria-pressed={isActive}
      onKeyDown={(e) => e.key === 'Enter' && playSong(song, index)}
    >
      {/* Index / Playing indicator */}
      <div className="song-index" aria-hidden="true">
        <span>{index + 1}</span>
        <div className="play-indicator">
          {isActive && isPlaying ? (
            <div className="now-playing-bars" title="Now playing">
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
            </div>
          ) : (
            <span>▶</span>
          )}
        </div>
      </div>

      {/* Song Info */}
      <div className="song-info">
        <img
          src={imgError ? `https://picsum.photos/seed/${song.id}/300/300` : song.image}
          alt={`${song.name} album art`}
          className="song-thumbnail"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className="song-text">
          <div className="song-title" title={song.name}>{song.name}</div>
          <div className="song-artist" title={song.artist_name}>{song.artist_name}</div>
        </div>
      </div>

      {/* Album */}
      <div className="song-album" title={song.album_name}>{song.album_name}</div>

      {/* Duration */}
      <div className="song-duration">{formatDuration(song.duration)}</div>
    </div>
  );
});

// ==========================================
// SongList Component
// ==========================================

export default function SongList() {
  const { state, dispatch, retry } = usePlayer();
  const {
    filteredSongs,
    songs,
    currentSong,
    isPlaying,
    loading,
    error,
    searchQuery,
    activeGenre,
  } = state;

  const GENRES = ['All', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Hip-Hop'];

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container" role="status">
          <div className="loading-spinner-wrapper" aria-hidden="true">
            <div className="loading-ring loading-ring-1" />
            <div className="loading-ring loading-ring-2" />
            <div className="loading-ring loading-ring-3" />
          </div>
          <p className="loading-text">Fetching music from Jamendo...</p>
        </div>
        <SkeletonList />
      </div>
    );
  }

  // ---- Error state ----
  if (error && !songs.length) {
    return (
      <div className="page-wrapper">
        <div className="error-container" role="alert">
          <div className="error-icon">😵</div>
          <h2 className="error-title">Couldn't load songs</h2>
          <p className="error-message">{error}</p>
          <button id="retry-btn" className="retry-btn" onClick={retry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-wrapper">
      {/* Featured / Hero */}
      {currentSong && <FeaturedCard song={currentSong} isPlaying={isPlaying} />}

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          {searchQuery ? `Results for "${searchQuery}"` : 'Trending Tracks'}
        </h1>
        <p className="page-subtitle">
          {filteredSongs.length} track{filteredSongs.length !== 1 ? 's' : ''} available
        </p>

        {/* Genre Filters */}
        <div className="genre-filters" role="group" aria-label="Genre filters">
          {GENRES.map((genre) => (
            <button
              key={genre}
              id={`genre-${genre.toLowerCase()}`}
              className={`genre-chip ${activeGenre === genre ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_GENRE', payload: genre })}
              aria-pressed={activeGenre === genre}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-icon">🎵</span>
          <span className="stat-value">{songs.length}</span>
          <span>songs loaded</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🎤</span>
          <span className="stat-value">
            {new Set(songs.map(s => s.artist_name)).size}
          </span>
          <span>artists</span>
        </div>
        {currentSong && (
          <div className="stat-item">
            <span className="stat-icon">▶</span>
            <span>Now playing:</span>
            <span className="stat-value">{currentSong.name}</span>
          </div>
        )}
      </div>

      {/* List Header */}
      {filteredSongs.length > 0 && (
        <div className="song-list-header" role="row" aria-hidden="true">
          <div>#</div>
          <div>Title</div>
          <div className="col-album">Album</div>
          <div style={{ textAlign: 'right' }}>⏱</div>
        </div>
      )}

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="empty-icon">🎼</div>
          <div className="empty-title">No songs found</div>
          <div className="empty-desc">Try a different search or genre filter</div>
        </div>
      ) : (
        <div className="song-list" role="list" aria-label="Songs">
          {filteredSongs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              isActive={currentSong?.id === song.id}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// ==========================================
// Featured Card
// ==========================================

function FeaturedCard({ song, isPlaying }) {
  const { playPause } = usePlayer();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="featured-section fade-in" aria-label="Now playing feature card">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${imgError ? `https://picsum.photos/seed/${song.id}/600/200` : song.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.08,
          filter: 'blur(20px)',
        }}
        aria-hidden="true"
      />
      <div className="featured-inner">
        <img
          src={imgError ? `https://picsum.photos/seed/${song.id}/300/300` : song.image}
          alt={`${song.name} album cover`}
          className={`featured-cover ${isPlaying ? 'playing' : ''}`}
          onError={() => setImgError(true)}
        />
        <div className="featured-text">
          <div className="featured-label">▶ Now Playing</div>
          <div className="featured-title">{song.name}</div>
          <div className="featured-artist">{song.artist_name} · {song.album_name}</div>
          <button
            id="featured-play-btn"
            className="featured-play-btn"
            onClick={playPause}
            aria-label={isPlaying ? `Pause ${song.name}` : `Play ${song.name}`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
