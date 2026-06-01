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
        this.audioContext = null;
        this.isPlaying = false;
        this.isRunning = false;
        this.isAudioUnlocked = false;
        this.autoPlayPending = false;

        this.currentOscillators = [];
        this.currentGainNodes = [];
        this.useWebAudio = true;

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
        console.log('🎯 绑定事件监听器');
        
        this.startBtn.addEventListener('click', async () => {
            console.log('=== 点击开始按钮 ===');
            await this.handleStartClick();
        });

        this.stopBtn.addEventListener('click', () => this.stop());

        this.manualSelectBtn.addEventListener('click', async () => {
            console.log('=== 点击手动选择歌单 ===');
            await this.handlePlayControlClick();
            this.openManualModal();
        });

        this.closeModalBtn.addEventListener('click', () => this.closeManualModal());

        this.playPauseBtn.addEventListener('click', async () => {
            console.log('=== 点击播放/暂停按钮 ===');
            await this.handlePlayControlClick();
            this.togglePlay();
        });

        this.prevBtn.addEventListener('click', async () => {
            console.log('=== 点击上一首按钮 ===');
            await this.handlePlayControlClick();
            this.playPrevious();
        });

        this.nextBtn.addEventListener('click', async () => {
            console.log('=== 点击下一首按钮 ===');
            await this.handlePlayControlClick();
            this.playNext();
        });

        this.audioPlayer.addEventListener('ended', () => {
            console.log('🎵 音频播放结束，自动播放下一首');
            this.playNext();
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.error('❌ HTML音频错误事件:', e);
            this.handleAudioError(e);
        });

        this.audioPlayer.addEventListener('loadeddata', () => {
            console.log('✅ HTML音频已加载');
        });

        this.audioPlayer.addEventListener('play', () => {
            console.log('▶️ HTML音频开始播放');
            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸️';
        });

        this.audioPlayer.addEventListener('pause', () => {
            console.log('⏸️ HTML音频暂停');
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶️';
        });

        this.manualModal.addEventListener('click', (e) => {
            if (e.target === this.manualModal) {
                this.closeManualModal();
            }
        });
    }

    async handleStartClick() {
        console.log('📋 处理开始点击事件');
        
        try {
            console.log('1️⃣ 解锁音频系统...');
            await this.unlockAudio();
            
            console.log('2️⃣ 启动摄像头和识别...');
            await this.start();
            
            console.log('3️⃣ 检查是否需要播放音乐...');
            if (!this.isPlaying) {
                console.log('4️⃣ 自动播放当前歌单...');
                await this.playCurrentTrack();
            }
        } catch (error) {
            console.error('❌ 处理开始点击失败:', error);
            this.showNotification('启动失败: ' + error.message);
        }
    }

    async handlePlayControlClick() {
        console.log('📋 处理播放控制点击事件');
        
        try {
            console.log('1️⃣ 检查音频解锁状态...');
            if (!this.isAudioUnlocked) {
                console.log('2️⃣ 解锁音频系统...');
                await this.unlockAudio();
            } else {
                console.log('✅ 音频已解锁');
            }
        } catch (error) {
            console.error('❌ 处理播放控制点击失败:', error);
        }
    }

    async unlockAudio() {
        console.log('🔓 ========================================');
        console.log('🔓 开始解锁音频系统');
        console.log('🔓 ========================================');

        try {
            if (!this.audioContext) {
                console.log('🔧 创建 AudioContext...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✅ AudioContext 创建成功，当前状态:', this.audioContext.state);
            }

            if (this.audioContext.state === 'suspended') {
                console.log('⏸️ AudioContext 处于 suspended 状态，调用 resume()...');
                
                const resumePromise = this.audioContext.resume();
                console.log('⏳ 等待 resume() 完成...');
                
                await resumePromise;
                
                console.log('⏱️ 检查 AudioContext 状态...');
                let waitCount = 0;
                while (this.audioContext.state !== 'running' && waitCount < 50) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    waitCount++;
                }
                
                console.log('✅ AudioContext 状态:', this.audioContext.state);
                
                if (this.audioContext.state !== 'running') {
                    throw new Error('AudioContext 未能切换到 running 状态，当前状态: ' + this.audioContext.state);
                }
            } else {
                console.log('✅ AudioContext 已经是 running 状态');
            }

            this.audioPlayer.muted = false;
            this.audioPlayer.volume = 0.5;
            console.log('🔊 HTMLAudioElement 音量设置为 0.5');

            console.log('🎵 播放无声测试音频...');
            const testOsc = this.audioContext.createOscillator();
            const testGain = this.audioContext.createGain();
            testGain.gain.value = 0;
            testOsc.connect(testGain);
            testGain.connect(this.audioContext.destination);
            testOsc.start();
            testOsc.stop();
            console.log('✅ 无声测试音频已播放');

            this.isAudioUnlocked = true;
            console.log('🎉 ========================================');
            console.log('🎉 音频系统完全解锁成功！');
            console.log('🎉 AudioContext 状态:', this.audioContext.state);
            console.log('🎉 ========================================');
            
            this.showNotification('音频系统已激活');
            return true;
        } catch (error) {
            console.error('❌ ========================================');
            console.error('❌ 音频解锁失败');
            console.error('❌ 错误类型:', error.name);
            console.error('❌ 错误信息:', error.message);
            console.error('❌ 错误堆栈:', error.stack);
            console.error('❌ ========================================');
            
            this.showNotification('音频解锁失败: ' + error.message);
            return false;
        }
    }

    handleAudioError(e) {
        console.error('❌ 音频播放错误事件:', e);
        const error = this.audioPlayer.error;
        if (error) {
            console.log('📋 错误代码:', error.code);
            console.log('📋 错误信息:', error.message);
            
            let errorMsg = '';
            switch (error.code) {
                case 1:
                    errorMsg = '音频被中断，请重试';
                    break;
                case 2:
                    errorMsg = '网络错误，无法加载音频';
                    break;
                case 3:
                    errorMsg = '音频解码错误，请检查文件格式';
                    break;
                case 4:
                    errorMsg = '音频格式不支持';
                    break;
                default:
                    errorMsg = '未知错误: ' + error.message;
            }
            
            console.log('⚠️ ' + errorMsg);
            this.showNotification(errorMsg);
        }
        
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
    }

    async init() {
        console.log('🚀 ========================================');
        console.log('🚀 初始化 Mood Music Player');
        console.log('🚀 ========================================');

        try {
            console.log('📦 加载 face-api.js 模型...');
            this.modelStatus.textContent = '加载模型中...';
            this.modelStatus.className = 'status-value loading';
            
            await this.emotionDetector.init();
            
            this.modelStatus.textContent = '已就绪';
            this.modelStatus.className = 'status-value ready';
            this.startBtn.disabled = false;
            console.log('✅ 模型加载完成');
        } catch (error) {
            console.error('❌ ========================================');
            console.error('❌ 模型加载失败');
            console.error('❌ 错误:', error);
            console.error('❌ ========================================');
            
            this.modelStatus.textContent = '加载失败';
            this.modelStatus.className = 'status-value error';
            this.showNotification('模型加载失败: ' + error.message);
        }

        this.updatePlaylistUI();
        this.updateNowPlaying();
        this.initEmotionBars();
        
        console.log('✅ Mood Music Player 初始化完成');
        console.log('📋 当前歌单:', this.playlistMapper.currentPlaylist);
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
        console.log('📷 ========================================');
        console.log('📷 启动摄像头和情绪识别');
        console.log('📷 ========================================');

        if (this.isRunning) {
            console.log('⚠️ 系统已经在运行中');
            return;
        }

        try {
            console.log('1️⃣ 请求摄像头权限...');
            console.log('   - 检查 navigator.mediaDevices:', !!navigator.mediaDevices);
            console.log('   - 检查 getUserMedia:', !!navigator.mediaDevices?.getUserMedia);

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持 getUserMedia API，请使用现代浏览器');
            }

            console.log('2️⃣ 调用 getUserMedia 请求摄像头...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            console.log('✅ 摄像头权限已获取');
            console.log('   - 视频轨道数:', stream.getVideoTracks().length);
            
            if (stream.getVideoTracks().length === 0) {
                throw new Error('无法获取视频轨道，请检查摄像头是否被占用');
            }

            console.log('3️⃣ 将视频流绑定到 video 元素...');
            this.video.srcObject = stream;
            
            console.log('4️⃣ 开始播放视频...');
            const playPromise = this.video.play();
            
            if (playPromise !== undefined) {
                await playPromise;
            }
            console.log('✅ 视频播放成功');

            this.placeholderView.style.display = 'none';
            this.videoContainer.style.display = 'block';
            this.emotionPanel.style.display = 'block';

            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';

            this.statusText.textContent = '运行中';
            this.statusText.className = 'status-value running';

            this.isRunning = true;

            console.log('5️⃣ 启动情绪识别...');
            await this.emotionDetector.start(this.video, this.canvas);

            this.emotionDetector.onEmotionDetected = (emotions) => {
                this.handleEmotionDetection(emotions);
            };

            this.emotionDetector.onFaceDetected = (detected) => {
                if (detected) {
                    console.log('👤 检测到人脸');
                }
            };

            this.emotionSmoother.onEmotionSmooth = (smoothed) => {
                this.updateEmotionBars(smoothed);
                this.updateCurrentEmotion(smoothed);
            };

            this.emotionSmoother.onStableEmotion = (emotion, duration) => {
                this.handleStableEmotion(emotion, duration);
            };

            console.log('✅ ========================================');
            console.log('✅ 情绪识别已完全启动');
            console.log('✅ ========================================');

        } catch (error) {
            console.error('❌ ========================================');
            console.error('❌ 启动摄像头失败');
            console.error('❌ 错误类型:', error.name);
            console.error('❌ 错误信息:', error.message);
            console.error('❌ ========================================');

            let userFriendlyMsg = '';
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                userFriendlyMsg = '摄像头权限被拒绝。请在浏览器地址栏点击摄像头图标，允许访问摄像头。';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                userFriendlyMsg = '未检测到摄像头。请确保您的设备有摄像头并且已连接。';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                userFriendlyMsg = '摄像头被占用。请关闭其他使用摄像头的应用程序（如Zoom、微信视频等）。';
            } else if (error.name === 'OverconstrainedError') {
                userFriendlyMsg = '摄像头参数不匹配。请尝试使用默认分辨率。';
            } else if (error.name === 'TypeError') {
                userFriendlyMsg = '浏览器配置错误。请检查您的浏览器是否支持摄像头功能。';
            } else if (error.name === 'SecurityError') {
                userFriendlyMsg = '安全错误。请使用 HTTPS 或 localhost 访问页面。';
            } else {
                userFriendlyMsg = '无法访问摄像头: ' + error.message;
            }

            console.log('⚠️ 用户友好错误信息:', userFriendlyMsg);
            
            this.statusText.textContent = '启动失败';
            this.statusText.className = 'status-value error';
            
            alert(userFriendlyMsg + '\n\n详细信息: ' + error.message);
        }
    }

    stop() {
        console.log('⏹️ ========================================');
        console.log('⏹️ 停止识别');
        console.log('⏹️ ========================================');

        if (!this.isRunning) return;

        this.emotionDetector.stop();
        this.emotionSmoother.reset();
        this.stopWebAudio();

        if (this.video.srcObject) {
            console.log('📷 停止视频流...');
            this.video.srcObject.getTracks().forEach(track => {
                console.log('   - 停止轨道:', track.kind);
                track.stop();
            });
            this.video.srcObject = null;
            console.log('✅ 视频流已停止');
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

        console.log('✅ 识别已停止');
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
        console.log(`🎭 稳定情绪: ${emotion}, 持续时间: ${duration}s`);
        
        const newPlaylist = this.playlistMapper.switchToEmotionPlaylist(emotion);
        
        if (newPlaylist) {
            this.currentPlaylist.textContent = newPlaylist.name;
            this.updatePlaylistUI();
            
            if (this.isAudioUnlocked) {
                console.log('🎵 音频已解锁，自动播放新歌单');
                this.playCurrentTrack();
            } else {
                this.autoPlayPending = true;
                console.log('🔓 音频未解锁，等待用户交互后再播放');
                this.showNotification('检测到情绪变化！点击播放按钮开始听歌');
            }
            
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
            li.addEventListener('click', async () => {
                console.log('🎵 点击歌单项:', index, track.title);
                await this.handlePlayControlClick();
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
        console.log('🔄 togglePlay - 当前播放状态:', this.isPlaying);
        if (this.isPlaying) {
            this.pause();
        } else {
            this.playCurrentTrack();
        }
    }

    async playCurrentTrack() {
        const track = this.playlistMapper.getCurrentTrack();
        if (!track) {
            console.log('❌ 没有找到曲目');
            return;
        }

        console.log('🎵 ========================================');
        console.log('🎵 准备播放:', track.title);
        console.log('🎵 ========================================');
        
        this.updateNowPlaying();
        this.updatePlaylistUI();
        
        if (!this.isAudioUnlocked) {
            console.log('🔓 音频未解锁，尝试先解锁...');
            const unlocked = await this.unlockAudio();
            if (!unlocked) {
                console.log('❌ 音频解锁失败，无法播放');
                this.showNotification('请先点击允许音频播放');
                return;
            }
        }

        this.stopWebAudio();

        if (this.useWebAudio) {
            console.log('🎹 使用 Web Audio API 播放');
            this.playWebAudio(track);
        } else {
            console.log('🎧 使用 HTMLAudioElement 播放');
            await this.playHTMLAudio(track);
        }
    }

    playWebAudio(track) {
        console.log('🎹 ========================================');
        console.log('🎹 Web Audio 播放');
        console.log('🎹 ========================================');

        try {
            if (!this.audioContext) {
                console.error('❌ 没有 AudioContext');
                throw new Error('AudioContext 未初始化');
            }

            if (this.audioContext.state !== 'running') {
                console.warn('⚠️ AudioContext 状态:', this.audioContext.state, '尝试恢复...');
            }

            const currentPlaylist = this.playlistMapper.getPlaylist(this.playlistMapper.currentPlaylist);
            const emotionType = this.getEmotionTypeFromPlaylist(currentPlaylist.id);
            
            console.log('🎭 情绪类型:', emotionType);
            console.log('🎹 音频上下文状态:', this.audioContext.state);
            
            this.createMoodMusic(emotionType, currentPlaylist);
            
            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸️';
            console.log('✅ Web Audio 播放已启动');
        } catch (error) {
            console.error('❌ Web Audio 播放失败:', error);
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶️';
            this.showNotification('播放失败: ' + error.message);
        }
    }

    getEmotionTypeFromPlaylist(playlistId) {
        const mapping = {
            'pop': 'happy',
            'classical': 'sad',
            'rock': 'angry',
            'ambient': 'neutral',
            'electronic': 'surprised',
            'chill': 'fearful',
            'jazz': 'disgusted',
            'default': 'neutral'
        };
        return mapping[playlistId] || 'neutral';
    }

    createMoodMusic(emotionType, playlist) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        this.stopWebAudio();

        console.log('🎼 为情绪创建音乐:', emotionType);

        const configs = {
            happy: {
                baseFreq: 523.25,
                intervals: [0, 4, 7, 12],
                tempo: 0.4,
                duration: 0.3,
                waveform: 'sine',
                description: 'C大调欢快旋律'
            },
            sad: {
                baseFreq: 392.00,
                intervals: [0, 3, 7, 10],
                tempo: 0.8,
                duration: 0.6,
                waveform: 'triangle',
                description: 'G小调舒缓旋律'
            },
            angry: {
                baseFreq: 220.00,
                intervals: [0, 1, 2, 3],
                tempo: 0.25,
                duration: 0.15,
                waveform: 'sawtooth',
                description: 'A小调强烈节奏'
            },
            neutral: {
                baseFreq: 440.00,
                intervals: [0, 4, 7, 11],
                tempo: 0.6,
                duration: 0.4,
                waveform: 'sine',
                description: 'A大调平静和弦'
            },
            surprised: {
                baseFreq: 659.25,
                intervals: [0, 5, 7, 12],
                tempo: 0.3,
                duration: 0.2,
                waveform: 'square',
                description: 'E大调跳跃音符'
            },
            fearful: {
                baseFreq: 293.66,
                intervals: [0, 1, 5, 8],
                tempo: 0.5,
                duration: 0.35,
                waveform: 'sine',
                description: 'D小调柔和旋律'
            },
            disgusted: {
                baseFreq: 349.23,
                intervals: [0, 4, 8, 11],
                tempo: 0.55,
                duration: 0.4,
                waveform: 'triangle',
                description: 'F大调爵士风格'
            }
        };

        const config = configs[emotionType] || configs.neutral;
        console.log('🎹 音乐配置:', config.description);

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.15;
        masterGain.connect(ctx.destination);
        this.currentGainNodes.push(masterGain);

        const playNote = (time, freq, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = config.waveform;
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
            gain.gain.linearRampToValueAtTime(0.2, time + duration * 0.5);
            gain.gain.linearRampToValueAtTime(0, time + duration);
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            osc.start(time);
            osc.stop(time + duration + 0.1);
            
            this.currentOscillators.push(osc);
        };

        const playChord = (time, baseFreq, duration) => {
            config.intervals.forEach((interval, index) => {
                const freq = baseFreq * Math.pow(2, interval / 12);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = config.waveform;
                osc.frequency.value = freq;
                
                const volume = 0.15 / (index + 1);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(volume, time + 0.05);
                gain.gain.linearRampToValueAtTime(volume * 0.7, time + duration * 0.7);
                gain.gain.linearRampToValueAtTime(0, time + duration);
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.start(time);
                osc.stop(time + duration + 0.2);
                
                this.currentOscillators.push(osc);
            });
        };

        const baseFreq = config.baseFreq;
        let time = now;

        for (let measure = 0; measure < 4; measure++) {
            if (emotionType === 'happy' || emotionType === 'surprised') {
                const notes = [0, 4, 7, 12, 7, 4, 0, 4];
                notes.forEach((interval) => {
                    const freq = baseFreq * Math.pow(2, interval / 12);
                    playNote(time, freq, config.duration);
                    time += config.tempo;
                });
            } else if (emotionType === 'angry') {
                for (let i = 0; i < 8; i++) {
                    const interval = config.intervals[i % config.intervals.length];
                    const freq = baseFreq * Math.pow(2, interval / 12);
                    playNote(time, freq, config.duration);
                    time += config.tempo;
                }
            } else if (emotionType === 'sad' || emotionType === 'fearful') {
                playChord(time, baseFreq, config.duration * 2);
                time += config.tempo * 2;
                playChord(time, baseFreq * Math.pow(2, 3 / 12), config.duration * 2);
                time += config.tempo * 2;
            } else {
                playChord(time, baseFreq, config.duration);
                time += config.tempo;
                playNote(time, baseFreq * 1.25, config.duration * 0.5);
                time += config.tempo * 0.5;
                playChord(time, baseFreq * Math.pow(2, 5 / 12), config.duration);
                time += config.tempo;
            }
        }

        const loopDuration = time - now;
        console.log('⏱️ 循环时长:', loopDuration.toFixed(2) + 's');

        this.loopInterval = setInterval(() => {
            if (this.isPlaying) {
                this.createMoodMusic(emotionType, playlist);
            }
        }, loopDuration * 1000);

        this.currentGainNodes.push(masterGain);
    }

    stopWebAudio() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }

        if (this.currentOscillators.length > 0) {
            this.currentOscillators.forEach(osc => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {
                }
            });
            this.currentOscillators = [];
        }

        if (this.currentGainNodes.length > 0) {
            this.currentGainNodes.forEach(gain => {
                try {
                    gain.disconnect();
                } catch (e) {
                }
            });
            this.currentGainNodes = [];
        }
    }

    async playHTMLAudio(track) {
        console.log('🎧 ========================================');
        console.log('🎧 HTML Audio 播放');
        console.log('🎧 ========================================');

        try {
            this.audioPlayer.src = track.file;
            this.audioPlayer.load();
            
            console.log('📥 正在加载音频:', track.file);
            
            const playPromise = this.audioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('✅ HTML 播放成功:', track.title);
                    this.isPlaying = true;
                    this.playPauseBtn.textContent = '⏸️';
                }).catch((error) => {
                    console.error('❌ HTML 播放失败:', error.name, error.message);
                    console.log('🔄 切换到 Web Audio API');
                    this.useWebAudio = true;
                    this.playWebAudio(track);
                });
            }
        } catch (error) {
            console.error('❌ 播放过程中发生错误:', error);
            console.log('🔄 切换到 Web Audio API');
            this.useWebAudio = true;
            this.playWebAudio(track);
        }
    }

    pause() {
        console.log('⏸️ 暂停播放');
        try {
            this.audioPlayer.pause();
        } catch (error) {
        }
        this.stopWebAudio();
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
    }

    async playNext() {
        console.log('➡️ 下一首');
        this.playlistMapper.nextTrack();
        await this.playCurrentTrack();
    }

    async playPrevious() {
        console.log('⬅️ 上一首');
        this.playlistMapper.prevTrack();
        await this.playCurrentTrack();
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
            option.addEventListener('click', async () => {
                console.log('手动选择歌单:', playlist.name);
                this.playlistMapper.setCurrentPlaylist(playlist.id);
                this.currentPlaylist.textContent = playlist.name;
                this.updatePlaylistUI();
                await this.playCurrentTrack();
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
        console.log('🔔 通知:', message);
        
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
    console.log('🚀 ========================================');
    console.log('🚀 页面加载完成，初始化 Mood Music Player');
    console.log('🚀 ========================================');
    
    console.log('📋 环境信息:');
    console.log('   - 用户代理:', navigator.userAgent);
    console.log('   - 支持 getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    console.log('   - 支持 AudioContext:', !!(window.AudioContext || window.webkitAudioContext));
    
    new MoodMusicPlayer();
});
