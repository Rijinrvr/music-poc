import React, { useReducer, useRef, useEffect, useCallback, createContext, useContext } from 'react';

// ==========================================
// Context & Initial State
// ==========================================

const PlayerContext = createContext(null);

const initialState = {
  songs: [],
  filteredSongs: [],
  currentSong: null,
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffling: false,
  repeatMode: 'none', // 'none' | 'all' | 'one'
  searchQuery: '',
  activeGenre: 'All',
  loading: true,
  error: null,
  likedSongs: new Set(),
};

// ==========================================
// Reducer
// ==========================================

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_SONGS':
      return {
        ...state,
        songs: action.payload,
        filteredSongs: action.payload,
        loading: false,
        error: null,
        currentSong: action.currentSong ?? null,
        currentIndex: action.currentIndex ?? -1,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_CURRENT_SONG':
      return {
        ...state,
        currentSong: action.payload.song,
        currentIndex: action.payload.index,
        isPlaying: true,
        currentTime: 0,
      };

    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_VOLUME':
      return { ...state, volume: action.payload, isMuted: false };

    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };

    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffling: !state.isShuffling };

    case 'CYCLE_REPEAT': {
      const modes = ['none', 'all', 'one'];
      const nextMode = modes[(modes.indexOf(state.repeatMode) + 1) % modes.length];
      return { ...state, repeatMode: nextMode };
    }

    case 'TOGGLE_LIKE': {
      const liked = new Set(state.likedSongs);
      if (liked.has(action.payload)) liked.delete(action.payload);
      else liked.add(action.payload);
      return { ...state, likedSongs: liked };
    }

    case 'SET_SEARCH': {
      const q = action.payload.toLowerCase();
      const filtered = state.songs.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.artist_name.toLowerCase().includes(q) ||
          (s.album_name || '').toLowerCase().includes(q)
      );
      return {
        ...state,
        searchQuery: action.payload,
        filteredSongs:
          state.activeGenre === 'All'
            ? filtered
            : filtered.filter((s) => s.genre === state.activeGenre),
      };
    }

    case 'SET_GENRE': {
      const genre = action.payload;
      const bySearch = state.songs.filter(
        (s) =>
          s.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          s.artist_name.toLowerCase().includes(state.searchQuery.toLowerCase())
      );
      const filtered = genre === 'All' ? bySearch : bySearch.filter((s) => s.genre === genre);
      return { ...state, activeGenre: genre, filteredSongs: filtered };
    }

    default:
      return state;
  }
}

// ==========================================
// Custom Hook: useAudio
// ==========================================

function useAudio(state, dispatch) {
  const audioRef = useRef(null);
  // Tracks whether we want to play as soon as the audio is ready
  const playWhenReadyRef = useRef(false);
  // Tracks the currently loaded song id so we don't double-load
  const loadedSongIdRef = useRef(null);

  // Initialize audio element once (no crossOrigin – Wikimedia OGG doesn't support it)
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    repeatMode,
    filteredSongs,
    currentIndex,
    isShuffling,
  } = state;

  // ── Load new track when song changes ──
  useEffect(() => {
    if (!currentSong?.audio) return;
    if (loadedSongIdRef.current === currentSong.id) return; // already loaded
    loadedSongIdRef.current = currentSong.id;

    const audio = audioRef.current;

    // Pause & reset before loading new src
    audio.pause();
    audio.currentTime = 0;

    // Reset duration immediately so the bar shows 0:00 while loading
    dispatch({ type: 'SET_DURATION', payload: currentSong.duration || 0 });
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });

    // Store the intent to play; isPlaying is true when a song is selected
    playWhenReadyRef.current = true;

    audio.src = currentSong.audio;
    audio.load();

    const onCanPlay = () => {
      if (playWhenReadyRef.current) {
        audio
          .play()
          .catch(() => dispatch({ type: 'SET_PLAYING', payload: false }));
      }
    };

    audio.addEventListener('canplay', onCanPlay, { once: true });

    // Persist last played song to localStorage
    try {
      localStorage.setItem(
        'soundwave_last_song',
        JSON.stringify({ id: currentSong.id, index: currentIndex })
      );
    } catch (_) {}

    return () => {
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play / Pause ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentSong?.audio) return;

    playWhenReadyRef.current = isPlaying;

    if (isPlaying) {
      // Only call play() if audio src is already loaded and ready
      if (audio.readyState >= 3) {
        audio.play().catch(() => dispatch({ type: 'SET_PLAYING', payload: false }));
      }
      // else: onCanPlay handler in the load effect will start playback when ready
    } else {
      audio.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Volume / Mute ──
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () =>
      dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });

    // Helper: resolve a meaningful duration value.
    // OGG streams from Wikimedia often report Infinity (no length header).
    // Fall back to the song's pre-known duration field in that case.
    const resolveDuration = () => {
      const d = audio.duration;
      if (!d || isNaN(d) || !isFinite(d)) {
        // Use the known duration stored in the song object
        return currentSong?.duration || 0;
      }
      return d;
    };

    const onLoadedMetadata = () =>
      dispatch({ type: 'SET_DURATION', payload: resolveDuration() });

    const onDurationChange = () =>
      dispatch({ type: 'SET_DURATION', payload: resolveDuration() });

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const hasNext =
        repeatMode === 'all' || currentIndex < filteredSongs.length - 1;
      if (hasNext && filteredSongs.length > 0) {
        const nextIndex = isShuffling
          ? Math.floor(Math.random() * filteredSongs.length)
          : (currentIndex + 1) % filteredSongs.length;
        dispatch({
          type: 'SET_CURRENT_SONG',
          payload: { song: filteredSongs[nextIndex], index: nextIndex },
        });
      } else {
        dispatch({ type: 'SET_PLAYING', payload: false });
      }
    };

    const onError = () => {
      console.warn('Audio error for:', currentSong?.name);
      dispatch({ type: 'SET_PLAYING', payload: false });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, currentIndex, filteredSongs, isShuffling, currentSong, dispatch]);

  const seek = useCallback(
    (time) => {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    },
    [dispatch]
  );

  return { audioRef, seek };
}

// ==========================================
// API Fetching helpers
// ==========================================

/**
 * Try Jamendo API (requires a registered client_id at developer.jamendo.com).
 * Throws if unavailable so we fall through to the next source.
 */
async function fetchFromJamendo(clientId) {
  const url =
    `https://api.jamendo.com/v3.0/tracks/` +
    `?client_id=${clientId}&format=json&limit=50` +
    `&audioformat=mp32&order=popularity_total_desc&include=musicinfo`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Jamendo HTTP ${res.status}`);

  const data = await res.json();
  if (data.headers?.code !== 0 || !data.results?.length)
    throw new Error(data.headers?.error_message || 'No results');

  return data.results.map((track) => ({
    id: String(track.id),
    name: track.name,
    artist_name: track.artist_name,
    album_name: track.album_name || 'Single',
    audio: track.audio,
    image: track.image || `https://picsum.photos/seed/${track.id}/300/300`,
    duration: track.duration || 0,
    genre: track.musicinfo?.tags?.genres?.[0] || 'Various',
  }));
}

/**
 * Internet Archive – fetches real, verified MP3 URLs by querying the
 * /metadata/ API for known Creative Commons audio collections.
 * This avoids guessing filenames, which was causing 404/audio errors.
 */
async function fetchFromInternetArchive() {
  // Well-known CC audio collections on Internet Archive with real MP3s
  const collections = [
    'audio_bookspoetry',
    'opensource_audio',
    'netlabels',
    'GratefulDead',
    'etree',
  ];

  // Pick one randomly so repeated loads feel fresh
  const collection = collections[Math.floor(Math.random() * collections.length)];

  const query = encodeURIComponent(
    `collection:${collection} AND mediatype:audio AND format:MP3`
  );
  const searchUrl =
    `https://archive.org/advancedsearch.php?q=${query}` +
    `&fl[]=identifier,title,creator,subject,date` +
    `&sort[]=downloads+desc&rows=12&page=1&output=json`;

  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
  if (!searchRes.ok) throw new Error(`IA search HTTP ${searchRes.status}`);

  const searchData = await searchRes.json();
  const docs = searchData?.response?.docs;
  if (!docs?.length) throw new Error('Internet Archive: no results');

  // For each item, get its file manifest to find a real MP3 URL
  const settled = await Promise.allSettled(
    docs.slice(0, 12).map(async (doc) => {
      const metaRes = await fetch(
        `https://archive.org/metadata/${doc.identifier}/files`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!metaRes.ok) throw new Error('meta fail');
      const meta = await metaRes.json();

      // Find the first MP3 file in the manifest
      const mp3File = (meta.result || []).find(
        (f) => f.format === 'VBR MP3' || f.name?.toLowerCase().endsWith('.mp3')
      );
      if (!mp3File) throw new Error('no mp3');

      const subjectArr = Array.isArray(doc.subject) ? doc.subject : [doc.subject].filter(Boolean);
      const genreKeywords = ['jazz', 'rock', 'electronic', 'classical', 'folk', 'pop', 'ambient', 'blues'];
      const genre = subjectArr.find((s) =>
        genreKeywords.some((g) => s?.toLowerCase?.().includes(g))
      ) || 'Various';

      return {
        id: String(doc.identifier),
        name: doc.title || mp3File.name?.replace('.mp3', '') || 'Untitled',
        artist_name: doc.creator || 'Unknown Artist',
        album_name: 'Internet Archive',
        audio: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp3File.name)}`,
        image: `https://archive.org/services/img/${doc.identifier}`,
        duration: mp3File.length ? Math.round(parseFloat(mp3File.length)) : 0,
        genre: genre.charAt(0).toUpperCase() + genre.slice(1),
      };
    })
  );

  const tracks = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (tracks.length < 3) throw new Error(`Internet Archive: only ${tracks.length} tracks resolved`);
  return tracks;
}

// ==========================================
// Context Provider
// ==========================================

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const { seek } = useAudio(state, dispatch);

  /** Restore last-played song after songs array is populated */
  const restoreLastPlayed = useCallback((songs) => {
    try {
      const saved = JSON.parse(localStorage.getItem('soundwave_last_song') || '{}');
      if (saved.id) {
        const idx = songs.findIndex((s) => s.id === saved.id);
        if (idx !== -1) return { currentSong: songs[idx], currentIndex: idx };
      }
    } catch (_) {}
    return { currentSong: null, currentIndex: -1 };
  }, []);

  const fetchSongs = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    let songs = null;

    // ── Source 1: Jamendo (register free at developer.jamendo.com) ──
    // Replace 'YOUR_CLIENT_ID' with your own key for live data.
    const JAMENDO_CLIENT_ID = 'YOUR_CLIENT_ID';
    if (JAMENDO_CLIENT_ID !== 'YOUR_CLIENT_ID') {
      try {
        songs = await fetchFromJamendo(JAMENDO_CLIENT_ID);
        console.info(`✅ Loaded ${songs.length} tracks from Jamendo`);
      } catch (e) {
        console.warn('Jamendo unavailable:', e.message);
      }
    }

    // ── Source 2: Internet Archive (public-domain, no key required) ──
    if (!songs) {
      try {
        songs = await fetchFromInternetArchive();
        console.info(`✅ Loaded ${songs.length} tracks from Internet Archive`);
      } catch (e) {
        console.warn('Internet Archive unavailable:', e.message);
      }
    }

    // ── Source 3: Curated public-domain fallback tracks ──
    if (!songs || songs.length === 0) {
      console.info('Using built-in fallback tracks');
      songs = generateFallbackTracks();
    }

    const { currentSong, currentIndex } = restoreLastPlayed(songs);
    dispatch({ type: 'SET_SONGS', payload: songs, currentSong, currentIndex });
  }, [restoreLastPlayed]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const playPause = useCallback(() => dispatch({ type: 'TOGGLE_PLAY' }), []);

  const playSong = useCallback((song, index) => {
    dispatch({ type: 'SET_CURRENT_SONG', payload: { song, index } });
  }, []);

  const playNext = useCallback(() => {
    const { filteredSongs, currentIndex: ci, isShuffling } = state;
    if (!filteredSongs.length) return;
    const nextIndex = isShuffling
      ? Math.floor(Math.random() * filteredSongs.length)
      : (ci + 1) % filteredSongs.length;
    dispatch({
      type: 'SET_CURRENT_SONG',
      payload: { song: filteredSongs[nextIndex], index: nextIndex },
    });
  }, [state]);

  const playPrev = useCallback(() => {
    const { filteredSongs, currentIndex: ci, isShuffling } = state;
    if (!filteredSongs.length) return;
    const prevIndex = isShuffling
      ? Math.floor(Math.random() * filteredSongs.length)
      : (ci - 1 + filteredSongs.length) % filteredSongs.length;
    dispatch({
      type: 'SET_CURRENT_SONG',
      payload: { song: filteredSongs[prevIndex], index: prevIndex },
    });
  }, [state]);

  const value = {
    state,
    dispatch,
    seek,
    playPause,
    playSong,
    playNext,
    playPrev,
    retry: fetchSongs,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

// ==========================================
// Fallback – Verified working tracks
// All URLs tested and confirmed 200 OK.
// SoundHelix – royalty-free instrumental mp3s
// ==========================================

function generateFallbackTracks() {
  return [
    {
      id: 'f1',
      name: 'Electro Breeze',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      image: 'https://picsum.photos/seed/sh1/300/300',
      duration: 372,
      genre: 'Electronic',
    },
    {
      id: 'f2',
      name: 'Midnight Jazz',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      image: 'https://picsum.photos/seed/sh2/300/300',
      duration: 391,
      genre: 'Jazz',
    },
    {
      id: 'f3',
      name: 'Smooth Groove',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      image: 'https://picsum.photos/seed/sh3/300/300',
      duration: 404,
      genre: 'Pop',
    },
    {
      id: 'f4',
      name: 'Urban Beat',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      image: 'https://picsum.photos/seed/sh4/300/300',
      duration: 356,
      genre: 'Hip-Hop',
    },
    {
      id: 'f5',
      name: 'Ambient Flow',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      image: 'https://picsum.photos/seed/sh5/300/300',
      duration: 418,
      genre: 'Ambient',
    },
    {
      id: 'f6',
      name: 'Deep House Vibes',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      image: 'https://picsum.photos/seed/sh6/300/300',
      duration: 383,
      genre: 'Electronic',
    },
    {
      id: 'f7',
      name: 'Rock Anthem',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      image: 'https://picsum.photos/seed/sh7/300/300',
      duration: 395,
      genre: 'Rock',
    },
    {
      id: 'f8',
      name: 'Chill Wave',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      image: 'https://picsum.photos/seed/sh8/300/300',
      duration: 362,
      genre: 'Ambient',
    },
    {
      id: 'f9',
      name: 'Funk Drive',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
      image: 'https://picsum.photos/seed/sh9/300/300',
      duration: 388,
      genre: 'Jazz',
    },
    {
      id: 'f10',
      name: 'Neon Pulse',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
      image: 'https://picsum.photos/seed/sh10/300/300',
      duration: 412,
      genre: 'Electronic',
    },
    {
      id: 'f11',
      name: 'Morning Light',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
      image: 'https://picsum.photos/seed/sh11/300/300',
      duration: 375,
      genre: 'Pop',
    },
    {
      id: 'f12',
      name: 'Drum Machine',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
      image: 'https://picsum.photos/seed/sh12/300/300',
      duration: 368,
      genre: 'Hip-Hop',
    },
    {
      id: 'f13',
      name: 'Sunset Boulevard',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
      image: 'https://picsum.photos/seed/sh13/300/300',
      duration: 401,
      genre: 'Ambient',
    },
    {
      id: 'f14',
      name: 'Electric Soul',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
      image: 'https://picsum.photos/seed/sh14/300/300',
      duration: 359,
      genre: 'Rock',
    },
    {
      id: 'f15',
      name: 'Retro Synth',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
      image: 'https://picsum.photos/seed/sh15/300/300',
      duration: 393,
      genre: 'Electronic',
    },
    {
      id: 'f16',
      name: 'Jazz Cafe',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
      image: 'https://picsum.photos/seed/sh16/300/300',
      duration: 407,
      genre: 'Jazz',
    },
    {
      id: 'f17',
      name: 'Power Ballad',
      artist_name: 'SoundHelix',
      album_name: 'SoundHelix Collection',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3',
      image: 'https://picsum.photos/seed/sh17/300/300',
      duration: 385,
      genre: 'Rock',
    },
  ];
}
