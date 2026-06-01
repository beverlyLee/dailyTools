import { useState, useRef, useEffect, useCallback } from 'react';
import { useEmotion } from '@/contexts/EmotionContext';
import type { Track } from '@/types';

export const MusicPlayer = () => {
  const { currentPlaylist, currentEmotion } = useEmotion();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack: Track | undefined = currentPlaylist?.tracks[currentTrackIndex];

  useEffect(() => {
    setCurrentTrackIndex(0);
    setProgress(0);
    setIsPlaying(false);
  }, [currentPlaylist]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.log('播放失败:', err);
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTrack]);

  const playNext = useCallback(() => {
    if (!currentPlaylist) return;
    setCurrentTrackIndex((prev) => (prev + 1) % currentPlaylist.tracks.length);
    setProgress(0);
    if (isPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch(console.error);
      }, 100);
    }
  }, [currentPlaylist, isPlaying]);

  const playPrevious = useCallback(() => {
    if (!currentPlaylist) return;
    setCurrentTrackIndex((prev) => (prev - 1 + currentPlaylist.tracks.length) % currentPlaylist.tracks.length);
    setProgress(0);
    if (isPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch(console.error);
      }, 100);
    }
  }, [currentPlaylist, isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(progress) ? 0 : progress);
  }, []);

  const handleEnded = useCallback(() => {
    playNext();
  }, [playNext]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  }, []);

  const selectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setProgress(0);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play().catch(console.error);
    }, 100);
  }, []);

  if (!currentPlaylist) {
    return (
      <div className="music-player empty">
        <div className="player-icon">🎵</div>
        <p>开始检测情绪以匹配音乐</p>
      </div>
    );
  }

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="player-header">
        <div className="playlist-icon">{currentPlaylist.icon}</div>
        <div className="playlist-info">
          <h3>{currentPlaylist.playlist_name}</h3>
          <p>{currentPlaylist.description}</p>
        </div>
      </div>

      <div className="current-track">
        <div className="track-artwork">{currentPlaylist.icon}</div>
        <div className="track-info">
          <h4 className="track-title">{currentTrack?.title || '未选择'}</h4>
          <p className="track-artist">{currentTrack?.artist || '-'}</p>
        </div>
      </div>

      <div className="progress-container" onClick={handleSeek}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-time">
          <span>{Math.floor((progress / 100) * 3)}:{String(Math.floor(((progress / 100) * 180) % 60)).padStart(2, '0')}</span>
          <span>3:00</span>
        </div>
      </div>

      <div className="controls">
        <button className="control-btn" onClick={playPrevious}>
          ⏮️
        </button>
        <button className="control-btn primary" onClick={togglePlay}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button className="control-btn" onClick={playNext}>
          ⏭️
        </button>
      </div>

      <div className="volume-control">
        <span>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="playlist-tracks">
        <h4>播放列表</h4>
        <ul>
          {currentPlaylist.tracks.map((track, index) => (
            <li
              key={index}
              className={index === currentTrackIndex ? 'active' : ''}
              onClick={() => selectTrack(index)}
            >
              <span className="track-number">{index + 1}</span>
              <div className="track-details">
                <span className="name">{track.title}</span>
                <span className="artist">{track.artist}</span>
              </div>
              {index === currentTrackIndex && isPlaying && (
                <span className="playing-indicator">🎵</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .music-player {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }

        .music-player.empty {
          text-align: center;
          padding: 60px 24px;
          color: #666;
        }

        .player-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .player-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }

        .playlist-icon {
          font-size: 48px;
        }

        .playlist-info h3 {
          margin: 0;
          font-size: 20px;
          color: #1a1a2e;
        }

        .playlist-info p {
          margin: 4px 0 0;
          font-size: 14px;
          color: #666;
        }

        .current-track {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .track-artwork {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .track-info .track-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .track-info .track-artist {
          margin: 4px 0 0;
          font-size: 14px;
          color: #666;
        }

        .progress-container {
          margin-bottom: 20px;
          cursor: pointer;
        }

        .progress-bar {
          height: 6px;
          background: #eee;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 3px;
          transition: width 0.1s linear;
        }

        .progress-time {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: #999;
        }

        .controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 50%;
          background: #f5f5f5;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #e8e8e8;
          transform: scale(1.05);
        }

        .control-btn.primary {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 24px;
        }

        .control-btn.primary:hover {
          transform: scale(1.1);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .volume-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: #eee;
          border-radius: 2px;
          outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #667eea;
          border-radius: 50%;
          cursor: pointer;
        }

        .playlist-tracks h4 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .playlist-tracks ul {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 200px;
          overflow-y: auto;
        }

        .playlist-tracks li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .playlist-tracks li:hover {
          background: #f5f5f5;
        }

        .playlist-tracks li.active {
          background: rgba(102, 126, 234, 0.1);
        }

        .track-number {
          width: 24px;
          text-align: center;
          font-size: 14px;
          color: #999;
          font-weight: 500;
        }

        .li.active .track-number {
          color: #667eea;
        }

        .track-details {
          flex: 1;
          min-width: 0;
        }

        .track-details .name {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #1a1a2e;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .track-details .artist {
          display: block;
          font-size: 12px;
          color: #999;
          margin-top: 2px;
        }

        .playing-indicator {
          font-size: 14px;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
