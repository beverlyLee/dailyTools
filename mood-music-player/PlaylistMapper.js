export class PlaylistMapper {
    constructor() {
        this.emotionToPlaylist = {
            happy: 'pop',
            sad: 'classical',
            angry: 'rock',
            neutral: 'ambient',
            surprised: 'electronic',
            fearful: 'chill',
            disgusted: 'jazz'
        };

        this.playlists = {
            default: {
                id: 'default',
                name: '默认歌单',
                icon: '🎵',
                description: '综合音乐推荐',
                tracks: [
                    { title: '轻松时光', artist: '未知艺术家', file: 'music/default1.mp3' },
                    { title: '午后阳光', artist: '未知艺术家', file: 'music/default2.mp3' },
                    { title: '微风轻拂', artist: '未知艺术家', file: 'music/default3.mp3' }
                ]
            },
            pop: {
                id: 'pop',
                name: '流行乐',
                icon: '🎤',
                description: '欢快的流行音乐',
                tracks: [
                    { title: '快乐节拍', artist: '流行歌手', file: 'music/pop1.mp3' },
                    { title: '阳光明媚', artist: '流行歌手', file: 'music/pop2.mp3' },
                    { title: '好心情', artist: '流行歌手', file: 'music/pop3.mp3' }
                ]
            },
            classical: {
                id: 'classical',
                name: '轻音乐/古典',
                icon: '🎻',
                description: '舒缓的古典音乐',
                tracks: [
                    { title: '月光奏鸣曲', artist: '贝多芬', file: 'music/classical1.mp3' },
                    { title: '致爱丽丝', artist: '贝多芬', file: 'music/classical2.mp3' },
                    { title: '小夜曲', artist: '莫扎特', file: 'music/classical3.mp3' }
                ]
            },
            rock: {
                id: 'rock',
                name: '摇滚乐',
                icon: '🎸',
                description: '释放情绪的摇滚',
                tracks: [
                    { title: '自由之路', artist: '摇滚乐队', file: 'music/rock1.mp3' },
                    { title: '狂野之心', artist: '摇滚乐队', file: 'music/rock2.mp3' },
                    { title: '呐喊', artist: '摇滚乐队', file: 'music/rock3.mp3' }
                ]
            },
            ambient: {
                id: 'ambient',
                name: '环境音乐',
                icon: '🌊',
                description: '平静的环境音乐',
                tracks: [
                    { title: '宁静之夜', artist: '环境艺术家', file: 'music/ambient1.mp3' },
                    { title: '森林呼吸', artist: '环境艺术家', file: 'music/ambient2.mp3' },
                    { title: '星空漫步', artist: '环境艺术家', file: 'music/ambient3.mp3' }
                ]
            },
            electronic: {
                id: 'electronic',
                name: '电子音乐',
                icon: '🎧',
                description: '动感的电子音乐',
                tracks: [
                    { title: '电音派对', artist: '电子制作人', file: 'music/electronic1.mp3' },
                    { title: '未来之声', artist: '电子制作人', file: 'music/electronic2.mp3' },
                    { title: '脉冲节奏', artist: '电子制作人', file: 'music/electronic3.mp3' }
                ]
            },
            chill: {
                id: 'chill',
                name: '舒缓音乐',
                icon: '☕',
                description: '放松的舒缓音乐',
                tracks: [
                    { title: '咖啡时光', artist: '舒缓艺术家', file: 'music/chill1.mp3' },
                    { title: '慢生活', artist: '舒缓艺术家', file: 'music/chill2.mp3' },
                    { title: '心灵港湾', artist: '舒缓艺术家', file: 'music/chill3.mp3' }
                ]
            },
            jazz: {
                id: 'jazz',
                name: '爵士乐',
                icon: '🎷',
                description: '优雅的爵士乐',
                tracks: [
                    { title: '爵士咖啡', artist: '爵士大师', file: 'music/jazz1.mp3' },
                    { title: '蓝调夜晚', artist: '爵士大师', file: 'music/jazz2.mp3' },
                    { title: '即兴演奏', artist: '爵士大师', file: 'music/jazz3.mp3' }
                ]
            }
        };

        this.currentPlaylist = 'default';
        this.currentTrackIndex = 0;
    }

    getPlaylistForEmotion(emotion) {
        const playlistId = this.emotionToPlaylist[emotion] || 'default';
        return this.playlists[playlistId];
    }

    getPlaylist(playlistId) {
        return this.playlists[playlistId] || this.playlists.default;
    }

    setCurrentPlaylist(playlistId) {
        this.currentPlaylist = playlistId;
        this.currentTrackIndex = 0;
        return this.getPlaylist(playlistId);
    }

    switchToEmotionPlaylist(emotion) {
        const playlist = this.getPlaylistForEmotion(emotion);
        
        if (playlist.id !== this.currentPlaylist) {
            this.currentPlaylist = playlist.id;
            this.currentTrackIndex = 0;
            return playlist;
        }
        
        return null;
    }

    getAllPlaylists() {
        return Object.values(this.playlists);
    }

    getCurrentTrack() {
        const playlist = this.getPlaylist(this.currentPlaylist);
        return playlist.tracks[this.currentTrackIndex] || null;
    }

    nextTrack() {
        const playlist = this.getPlaylist(this.currentPlaylist);
        this.currentTrackIndex = (this.currentTrackIndex + 1) % playlist.tracks.length;
        return this.getCurrentTrack();
    }

    prevTrack() {
        const playlist = this.getPlaylist(this.currentPlaylist);
        this.currentTrackIndex = (this.currentTrackIndex - 1 + playlist.tracks.length) % playlist.tracks.length;
        return this.getCurrentTrack();
    }

    setTrackIndex(index) {
        const playlist = this.getPlaylist(this.currentPlaylist);
        if (index >= 0 && index < playlist.tracks.length) {
            this.currentTrackIndex = index;
            return true;
        }
        return false;
    }

    getEmotionLabel(emotionName) {
        const labels = {
            happy: '高兴',
            sad: '悲伤',
            angry: '愤怒',
            neutral: '平静',
            surprised: '惊讶',
            fearful: '恐惧',
            disgusted: '厌恶'
        };
        return labels[emotionName] || emotionName;
    }
}
