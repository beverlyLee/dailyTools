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
                    { title: 'Toccata and Fugue', artist: 'Bach', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Johann_Sebastian_Bach_-_Toccata_and_Fugue_in_D_minor_-_BR_Klassik.ogg/Johann_Sebastian_Bach_-_Toccata_and_Fugue_in_D_minor_-_BR_Klassik.ogg.mp3' },
                    { title: 'Symphony No.5', artist: 'Beethoven', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4b/Ludwig_van_Beethoven_-_Symphony_No_5_in_C_minor%2C_Op_67_-_I._Allegro_con_brio.ogg/Ludwig_van_Beethoven_-_Symphony_No_5_in_C_minor%2C_Op_67_-_I._Allegro_con_brio.ogg.mp3' },
                    { title: 'Moonlight Sonata', artist: 'Beethoven', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/42/Beethoven_-_Piano_Sonata_No.14_in_C-Sharp_Minor%2C_Op.27_No.2_-_I._Adagio_sostenuto.ogg/Beethoven_-_Piano_Sonata_No.14_in_C-Sharp_Minor%2C_Op.27_No.2_-_I._Adagio_sostenuto.ogg.mp3' }
                ]
            },
            pop: {
                id: 'pop',
                name: '流行乐',
                icon: '🎤',
                description: '欢快的流行音乐',
                tracks: [
                    { title: 'Happy Vibes', artist: 'Pop Artist', file: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_4d491d4e8c.mp3' },
                    { title: 'Upbeat Pop', artist: 'Pop Artist', file: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
                    { title: 'Summer Party', artist: 'Pop Artist', file: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_7491f00230.mp3' }
                ]
            },
            classical: {
                id: 'classical',
                name: '轻音乐/古典',
                icon: '🎻',
                description: '舒缓的古典音乐',
                tracks: [
                    { title: 'Clair de Lune', artist: 'Debussy', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4b/Suite_bergamasque_-_3._Clair_de_Lune.ogg/Suite_bergamasque_-_3._Clair_de_Lune.ogg.mp3' },
                    { title: 'Eine Kleine', artist: 'Mozart', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6d/Wolfgang_Amadeus_Mozart_-_Eine_kleine_Nachtmusik_-_I._Allegro.ogg/Wolfgang_Amadeus_Mozart_-_Eine_kleine_Nachtmusik_-_I._Allegro.ogg.mp3' },
                    { title: 'Canon in D', artist: 'Pachelbel', file: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/cd/Canon_in_D_Major_-_Johann_Pachelbel.ogg/Canon_in_D_Major_-_Johann_Pachelbel.ogg.mp3' }
                ]
            },
            rock: {
                id: 'rock',
                name: '摇滚乐',
                icon: '🎸',
                description: '释放情绪的摇滚',
                tracks: [
                    { title: 'Rock Guitar', artist: 'Rock Band', file: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_f7b204c21b.mp3' },
                    { title: 'Heavy Beat', artist: 'Rock Band', file: 'https://cdn.pixabay.com/download/audio/2021/08/02/audio_b676e12a0e.mp3' },
                    { title: 'Rock Energy', artist: 'Rock Band', file: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_96335261d1.mp3' }
                ]
            },
            ambient: {
                id: 'ambient',
                name: '环境音乐',
                icon: '🌊',
                description: '平静的环境音乐',
                tracks: [
                    { title: 'Ambient Calm', artist: 'Ambient Artist', file: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_001601e0c6.mp3' },
                    { title: 'Peaceful Mood', artist: 'Ambient Artist', file: 'https://cdn.pixabay.com/download/audio/2022/08/23/audio_d16713bd38.mp3' },
                    { title: 'Soft Ambience', artist: 'Ambient Artist', file: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_f77949331f.mp3' }
                ]
            },
            electronic: {
                id: 'electronic',
                name: '电子音乐',
                icon: '🎧',
                description: '动感的电子音乐',
                tracks: [
                    { title: 'Electronic Beat', artist: 'Electronic Producer', file: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_352ed9f2e5.mp3' },
                    { title: 'Synth Wave', artist: 'Electronic Producer', file: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_5ca5391702.mp3' },
                    { title: 'Future Bass', artist: 'Electronic Producer', file: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_3de74078ee.mp3' }
                ]
            },
            chill: {
                id: 'chill',
                name: '舒缓音乐',
                icon: '☕',
                description: '放松的舒缓音乐',
                tracks: [
                    { title: 'Chill Lounge', artist: 'Chill Artist', file: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_338cb3cd07.mp3' },
                    { title: 'Coffee Break', artist: 'Chill Artist', file: 'https://cdn.pixabay.com/download/audio/2022/05/13/audio_0f9b042a66.mp3' },
                    { title: 'Relax Time', artist: 'Chill Artist', file: 'https://cdn.pixabay.com/download/audio/2022/10/02/audio_824c149757.mp3' }
                ]
            },
            jazz: {
                id: 'jazz',
                name: '爵士乐',
                icon: '🎷',
                description: '优雅的爵士乐',
                tracks: [
                    { title: 'Jazz Cafe', artist: 'Jazz Master', file: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_18b79f3e6e.mp3' },
                    { title: 'Smooth Jazz', artist: 'Jazz Master', file: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8ab1f3d6d7.mp3' },
                    { title: 'Jazz Night', artist: 'Jazz Master', file: 'https://cdn.pixabay.com/download/audio/2021/08/20/audio_e1535e18e2.mp3' }
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
