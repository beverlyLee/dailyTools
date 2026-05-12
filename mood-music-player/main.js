import { EmotionDetector } from './EmotionDetector.js';
import { EmotionSmoother } from './EmotionSmoother.js';
import { PlaylistMapper } from './PlaylistMapper.js';

class MoodMusicPlayer {
    constructor() {
        this.emotionDetector = new EmotionDetector();
        this.emotionSmoother = new EmotionSmoother({
            windowSize: 30,
            stableThreshold: 0.5,
            switchDelay: 5000
        });
        this.playlistMapper = new PlaylistMapper();

        this.video = null;
        this.canvas = null;
        this.audioPlayer = null;
        this.isPlaying = false;
        this.isRunning = false;

        this.initElements();
        this.bindEvents();
        this.init();
    }

    initElements() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.audioPlayer = document.getElementById('audioPlayer');

        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.manualSelectBtn = document.getElementById('manualSelectBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        this.statusText = document.getElementById('statusText');
        this.modelStatus = document.getElementById('modelStatus');
        this.currentEmotion = document.getElementById('currentEmotion');
        this.currentPlaylist = document.getElementById('currentPlaylist');
        this.emotionDuration = document.getElementById('emotionDuration');

        this.placeholderView = document.getElementById('placeholderView');
        this.videoContainer = document.getElementById('videoContainer');
        this.emotionPanel = document.getElementById('emotionPanel');
        this.emotionBars = document.getElementById('emotionBars');

        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.albumArt = document.getElementById('albumArt');
        this.playlistEl = document.getElementById('playlist');

        this.manualModal = document.getElementById('manualModal');
        this.playlistOptions = document.getElementById('playlistOptions');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.manualSelectBtn.addEventListener('click', () => this.openManualModal());
        this.closeModalBtn.addEventListener('click', () => this.closeManualModal());

        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());

        this.audioPlayer.addEventListener('ended', () => this.playNext());

        this.manualModal.addEventListener('click', (e) => {
            if (e.target === this.manualModal) {
                this.closeManualModal();
            }
        });
    }

    async init() {
        try {
            await this.emotionDetector.init();
            this.modelStatus.textContent = '已就绪';
            this.modelStatus.className = 'status-value ready';
            this.startBtn.disabled = false;
        } catch (error) {
            console.error('模型加载失败:', error);
            this.modelStatus.textContent = '加载失败';
            this.modelStatus.className = 'status-value error';
        }

        this.updatePlaylistUI();
        this.updateNowPlaying();
        this.initEmotionBars();
    }

    initEmotionBars() {
        const emotions = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted'];
        this.emotionBars.innerHTML = '';

        emotions.forEach(emotion => {
            const bar = document.createElement('div');
            bar.className = 'emotion-bar';
            bar.innerHTML = `
                <span class="emotion-label">${this.getEmotionIcon(emotion)}</span>
                <div class="emotion-progress">
                    <div class="emotion-fill ${emotion}" style="width: 0%"></div>
                </div>
                <span class="emotion-percent">0%</span>
            `;
            this.emotionBars.appendChild(bar);
        });
    }

    getEmotionIcon(emotion) {
        const icons = {
            happy: '😊',
            sad: '😢',
            angry: '😠',
            neutral: '😐',
            surprised: '😲',
            fearful: '😨',
            disgusted: '🤢'
        };
        return icons[emotion] || '😶';
    }

    async start() {
        if (this.isRunning) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });

            this.video.srcObject = stream;
            await this.video.play();

            this.placeholderView.style.display = 'none';
            this.videoContainer.style.display = 'block';
            this.emotionPanel.style.display = 'block';

            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';

            this.statusText.textContent = '运行中';
            this.statusText.className = 'status-value running';

            this.isRunning = true;

            await this.emotionDetector.start(this.video, this.canvas);

            this.emotionDetector.onEmotionDetected = (emotions) => {
                this.handleEmotionDetection(emotions);
            };

            this.emotionSmoother.onEmotionSmooth = (smoothed) => {
                this.updateEmotionBars(smoothed);
                this.updateCurrentEmotion(smoothed);
            };

            this.emotionSmoother.onStableEmotion = (emotion, duration) => {
                this.handleStableEmotion(emotion, duration);
            };

        } catch (error) {
            console.error('启动失败:', error);
            alert('无法访问摄像头，请检查权限设置');
        }
    }

    stop() {
        if (!this.isRunning) return;

        this.emotionDetector.stop();
        this.emotionSmoother.reset();

        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }

        this.placeholderView.style.display = 'block';
        this.videoContainer.style.display = 'none';
        this.emotionPanel.style.display = 'none';

        this.startBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'none';

        this.statusText.textContent = '等待开始';
        this.statusText.className = 'status-value idle';

        this.currentEmotion.textContent = '--';

        this.isRunning = false;
    }

    handleEmotionDetection(emotions) {
        this.emotionSmoother.addFrame(emotions);
        this.updateEmotionDuration();
    }

    updateEmotionBars(smoothed) {
        const emotions = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted'];
        const bars = this.emotionBars.querySelectorAll('.emotion-bar');

        emotions.forEach((emotion, index) => {
            const value = smoothed[emotion] || 0;
            const percent = Math.round(value * 100);
            const bar = bars[index];
            
            if (bar) {
                bar.querySelector('.emotion-fill').style.width = `${percent}%`;
                bar.querySelector('.emotion-percent').textContent = `${percent}%`;
            }
        });
    }

    updateCurrentEmotion(smoothed) {
        let maxEmotion = 'neutral';
        let maxValue = 0;

        Object.entries(smoothed).forEach(([emotion, value]) => {
            if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
            }
        });

        const label = this.playlistMapper.getEmotionLabel(maxEmotion);
        this.currentEmotion.textContent = `${this.getEmotionIcon(maxEmotion)} ${label} (${Math.round(maxValue * 100)}%)`;
    }

    updateEmotionDuration() {
        const duration = this.emotionSmoother.getCurrentStableDuration();
        this.emotionDuration.textContent = `${duration.toFixed(1)}s`;
    }

    handleStableEmotion(emotion, duration) {
        console.log(`稳定情绪: ${emotion}, 持续时间: ${duration}s`);
        
        const newPlaylist = this.playlistMapper.switchToEmotionPlaylist(emotion);
        
        if (newPlaylist) {
            this.currentPlaylist.textContent = newPlaylist.name;
            this.updatePlaylistUI();
            this.playCurrentTrack();
            
            const label = this.playlistMapper.getEmotionLabel(emotion);
            this.showNotification(`检测到您${label}，已为您切换到${newPlaylist.name}`);
        }
    }

    updatePlaylistUI() {
        const playlist = this.playlistMapper.getPlaylist(this.playlistMapper.currentPlaylist);
        this.playlistEl.innerHTML = '';
        this.albumArt.textContent = playlist.icon;

        playlist.tracks.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = index === this.playlistMapper.currentTrackIndex ? 'active' : '';
            li.innerHTML = `
                <div class="track-name">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            `;
            li.addEventListener('click', () => {
                this.playlistMapper.setTrackIndex(index);
                this.playCurrentTrack();
            });
            this.playlistEl.appendChild(li);
        });
    }

    updateNowPlaying() {
        const track = this.playlistMapper.getCurrentTrack();
        if (track) {
            this.trackTitle.textContent = track.title;
            this.trackArtist.textContent = track.artist;
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.playCurrentTrack();
        }
    }

    playCurrentTrack() {
        const track = this.playlistMapper.getCurrentTrack();
        if (track) {
            this.updateNowPlaying();
            this.updatePlaylistUI();
            
            this.audioPlayer.src = track.file;
            this.audioPlayer.play().catch(() => {
                console.log('无法自动播放音乐，请手动点击播放');
            });

            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸️';
        }
    }

    pause() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
    }

    playNext() {
        this.playlistMapper.nextTrack();
        this.playCurrentTrack();
    }

    playPrevious() {
        this.playlistMapper.prevTrack();
        this.playCurrentTrack();
    }

    openManualModal() {
        this.playlistOptions.innerHTML = '';
        
        const allPlaylists = this.playlistMapper.getAllPlaylists();
        
        allPlaylists.forEach(playlist => {
            const option = document.createElement('div');
            option.className = `playlist-option ${playlist.id === this.playlistMapper.currentPlaylist ? 'active' : ''}`;
            option.innerHTML = `
                <div class="option-icon">${playlist.icon}</div>
                <div class="option-info">
                    <h4>${playlist.name}</h4>
                    <p>${playlist.description}</p>
                </div>
            `;
            option.addEventListener('click', () => {
                this.playlistMapper.setCurrentPlaylist(playlist.id);
                this.currentPlaylist.textContent = playlist.name;
                this.updatePlaylistUI();
                this.playCurrentTrack();
                this.closeManualModal();
            });
            this.playlistOptions.appendChild(option);
        });

        this.manualModal.style.display = 'flex';
    }

    closeManualModal() {
        this.manualModal.style.display = 'none';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            style.textContent += `
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new MoodMusicPlayer();
});
