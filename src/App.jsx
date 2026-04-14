import React from 'react';
import { PlayerProvider } from './context/PlayerContext';
import Navbar from './components/Navbar';
import SongList from './components/SongList';
import Player from './components/Player';

/**
 * App.jsx – Root component
 *
 * Wraps the entire application in PlayerProvider (Context + Reducer),
 * then renders:
 *  - Ambient animated background
 *  - Sticky Navbar (search + controls)
 *  - Main content (SongList with featured hero)
 *  - Fixed bottom Player bar
 */
export default function App() {
  return (
    <PlayerProvider>
      <div className="app-container">
        {/* Decorative ambient orbs */}
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>

        {/* Sticky top navigation */}
        <Navbar />

        {/* Main scrollable content */}
        <div className="main-content">
          <SongList />
        </div>

        {/* Fixed bottom music player */}
        <Player />
      </div>
    </PlayerProvider>
  );
}
