import React from 'react';
import { usePlayer } from '../context/PlayerContext';

// ==========================================
// Navbar Component
// ==========================================

export default function Navbar() {
  const { state, dispatch } = usePlayer();
  const { searchQuery, isShuffling, repeatMode } = state;

  const handleSearch = (e) => {
    dispatch({ type: 'SET_SEARCH', payload: e.target.value });
  };

  const clearSearch = () => {
    dispatch({ type: 'SET_SEARCH', payload: '' });
  };

  return (
    <nav className="navbar" role="banner">
      {/* Logo */}
      <a className="navbar-logo" href="#" aria-label="SoundWave Home">
        <div className="logo-icon" aria-hidden="true">🎵</div>
        <span className="logo-text">SoundWave</span>
      </a>

      {/* Search */}
      <div className="navbar-search">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            id="search-input"
            type="search"
            className="search-input"
            placeholder="Search songs, artists, albums..."
            value={searchQuery}
            onChange={handleSearch}
            aria-label="Search songs"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Nav Actions */}
      <div className="navbar-actions">
        <button
          id="shuffle-nav-btn"
          className={`nav-btn ${isShuffling ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
          aria-pressed={isShuffling}
          aria-label="Toggle shuffle"
          title="Shuffle"
        >
          🔀 <span>Shuffle</span>
        </button>

        <button
          id="repeat-nav-btn"
          className={`nav-btn ${repeatMode !== 'none' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'CYCLE_REPEAT' })}
          aria-label={`Repeat mode: ${repeatMode}`}
          title={`Repeat: ${repeatMode}`}
        >
          {repeatMode === 'one' ? '🔂' : '🔁'}{' '}
          <span>{repeatMode === 'none' ? 'Repeat' : repeatMode === 'all' ? 'All' : 'One'}</span>
        </button>
      </div>
    </nav>
  );
}
