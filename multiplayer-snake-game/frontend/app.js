class SnakeGameClient {
    constructor() {
        this.ws = null;
        this.roomID = null;
        this.isOwner = false;
        this.currentRoomInfo = null;
        this.gameState = null;
        this.canvas = null;
        this.ctx = null;
        this.cellSize = 25;
        this.init();
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.checkURLParams();
    }

    setupEventListeners() {
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinForm());
        document.getElementById('confirm-join-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('copy-link-btn').addEventListener('click', () => this.copyInviteLink());
        document.getElementById('back-to-lobby-btn').addEventListener('click', () => this.backToLobby());

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomID = urlParams.get('room');
        const inviteCode = urlParams.get('invite');

        if (roomID || inviteCode) {
            document.getElementById('join-room-form').classList.remove('hidden');
            if (roomID) {
                document.getElementById('room-id').value = roomID;
            } else if (inviteCode) {
                document.getElementById('room-id').value = inviteCode;
            }
        }
    }

    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsURL = `${protocol}//${window.location.host}/ws`;

            this.ws = new WebSocket(wsURL);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.showError('连接已断开，请刷新页面重试');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    sendMessage(type, payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: type,
                payload: payload
            }));
        }
    }

    handleMessage(message) {
        console.log('Received:', message.type);

        switch (message.type) {
            case 'roomInfo':
                this.handleRoomInfo(message.payload);
                break;
            case 'playerJoined':
                this.handlePlayerJoined(message.payload);
                break;
            case 'playerLeft':
                this.handlePlayerLeft(message.payload);
                break;
            case 'gameState':
                this.handleGameState(message.payload);
                break;
            case 'gameOver':
                this.handleGameOver(message.payload);
                break;
            case 'error':
                this.showError(message.payload.message);
                break;
            case 'roomList':
                this.handleRoomList(message.payload);
                break;
        }
    }

    async createRoom() {
        const playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            this.showError('请输入你的名字');
            return;
        }

        try {
            await this.connectWebSocket();
            this.sendMessage('createRoom', {
                roomName: `${playerName}的房间`,
                playerName: playerName,
                maxPlayers: 4
            });
        } catch (error) {
            this.showError('连接服务器失败');
        }
    }

    showJoinForm() {
        document.getElementById('join-room-form').classList.toggle('hidden');
    }

    async joinRoom() {
        const playerName = document.getElementById('player-name').value.trim();
        const roomInput = document.getElementById('room-id').value.trim();

        if (!playerName) {
            this.showError('请输入你的名字');
            return;
        }

        if (!roomInput) {
            this.showError('请输入房间ID或邀请码');
            return;
        }

        try {
            await this.connectWebSocket();
            
            const payload = {
                playerName: playerName
            };

            if (roomInput.length === 6) {
                payload.inviteCode = roomInput;
            } else {
                payload.roomId = roomInput;
            }

            this.sendMessage('joinRoom', payload);
        } catch (error) {
            this.showError('连接服务器失败');
        }
    }

    handleRoomInfo(payload) {
        this.currentRoomInfo = payload;
        this.roomID = payload.roomId;
        
        document.getElementById('room-name-display').textContent = payload.roomName;
        
        const inviteLink = `${window.location.origin}${window.location.pathname}?room=${payload.roomId}`;
        document.getElementById('invite-link').textContent = inviteLink;

        this.updatePlayerList();

        if (payload.status === 'waiting') {
            this.showScreen('waiting-screen');
            this.checkOwnerStatus();
        }
    }

    handlePlayerJoined(payload) {
        if (this.currentRoomInfo) {
            this.currentRoomInfo.playerNames[payload.playerId] = payload.playerName;
            this.updatePlayerList();
        }
    }

    handlePlayerLeft(payload) {
        if (this.currentRoomInfo) {
            delete this.currentRoomInfo.playerNames[payload.playerId];
            this.updatePlayerList();
        }
    }

    updatePlayerList() {
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';

        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        let colorIndex = 0;

        for (const [playerId, playerName] of Object.entries(this.currentRoomInfo.playerNames)) {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="player-color" style="background-color: ${colors[colorIndex % colors.length]}"></span>
                <span>${playerName}</span>
            `;
            playerList.appendChild(li);
            colorIndex++;
        }
    }

    checkOwnerStatus() {
        if (this.currentRoomInfo) {
            const playerCount = Object.keys(this.currentRoomInfo.playerNames).length;
            if (playerCount >= 2) {
                document.getElementById('start-game-btn-container').classList.remove('hidden');
            } else {
                document.getElementById('start-game-btn-container').classList.add('hidden');
            }
        }
    }

    startGame() {
        this.sendMessage('startGame', {});
        this.showScreen('game-screen');
        this.resizeCanvas();
    }

    handleGameState(payload) {
        this.gameState = payload;
        this.renderGame();
        this.updateScoreboard();
    }

    handleGameOver(payload) {
        document.getElementById('winner-display').textContent = payload.winner 
            ? `🏆 获胜者: ${payload.winner}` 
            : '游戏平局!';
        
        this.updateFinalScores();
        this.showScreen('game-over-screen');
    }

    updateScoreboard() {
        if (!this.gameState) return;

        const scoresContainer = document.getElementById('scores');
        scoresContainer.innerHTML = '';

        const snakesArray = Object.values(this.gameState.snakes);
        snakesArray.sort((a, b) => b.score - a.score);

        for (const snake of snakesArray) {
            const div = document.createElement('div');
            div.className = 'score-item';
            div.innerHTML = `
                <span>${snake.name}: ${snake.score}</span>
                <span class="score-color" style="background-color: ${snake.color}"></span>
            `;
            scoresContainer.appendChild(div);
        }
    }

    updateFinalScores() {
        if (!this.gameState) return;

        const scoresContainer = document.getElementById('final-scores-list');
        scoresContainer.innerHTML = '';

        const snakesArray = Object.values(this.gameState.snakes);
        snakesArray.sort((a, b) => b.score - a.score);

        for (const snake of snakesArray) {
            const div = document.createElement('div');
            div.className = 'final-score-item';
            div.innerHTML = `
                <div class="player-info">
                    <span class="score-color" style="background-color: ${snake.color}"></span>
                    <span>${snake.name} ${!snake.alive ? '💀' : ''}</span>
                </div>
                <span class="score">${snake.score}</span>
            `;
            scoresContainer.appendChild(div);
        }
    }

    resizeCanvas() {
        if (!this.gameState) return;
        
        const width = this.gameState.width * this.cellSize;
        const height = this.gameState.height * this.cellSize;
        
        this.canvas.width = width;
        this.canvas.height = height;
    }

    renderGame() {
        if (!this.gameState || !this.ctx) return;

        const { width, height, snakes, foods } = this.gameState;
        
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, height * this.cellSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(width * this.cellSize, y * this.cellSize);
            this.ctx.stroke();
        }

        for (const food of foods) {
            this.drawFood(food);
        }

        for (const [id, snake] of Object.entries(snakes)) {
            this.drawSnake(snake);
        }
    }

    drawFood(food) {
        const x = food.point.x * this.cellSize;
        const y = food.point.y * this.cellSize;
        const radius = this.cellSize / 2 - 2;

        const gradient = this.ctx.createRadialGradient(
            x + this.cellSize / 2, y + this.cellSize / 2, 0,
            x + this.cellSize / 2, y + this.cellSize / 2, radius
        );
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ee5a5a');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowColor = '#ff6b6b';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    drawSnake(snake) {
        if (!snake.alive) {
            this.ctx.globalAlpha = 0.5;
        }

        const body = snake.body;
        const color = snake.color;

        for (let i = 0; i < body.length; i++) {
            const x = body[i].x * this.cellSize;
            const y = body[i].y * this.cellSize;
            const size = this.cellSize - 2;
            const radius = 4;

            if (i === 0) {
                const gradient = this.ctx.createRadialGradient(
                    x + this.cellSize / 2, y + this.cellSize / 2, 0,
                    x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 2
                );
                gradient.addColorStop(0, this.lightenColor(color, 20));
                gradient.addColorStop(1, color);

                this.ctx.fillStyle = gradient;
                this.roundRect(x + 1, y + 1, size, size, radius);
                this.ctx.fill();

                this.ctx.fillStyle = '#fff';
                const eyeSize = 4;
                const eyeOffset = 6;

                let eye1X, eye1Y, eye2X, eye2Y;
                switch (snake.direction) {
                    case 'up':
                        eye1X = x + eyeOffset;
                        eye1Y = y + eyeOffset;
                        eye2X = x + this.cellSize - eyeOffset - eyeSize;
                        eye2Y = y + eyeOffset;
                        break;
                    case 'down':
                        eye1X = x + eyeOffset;
                        eye1Y = y + this.cellSize - eyeOffset - eyeSize;
                        eye2X = x + this.cellSize - eyeOffset - eyeSize;
                        eye2Y = y + this.cellSize - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        eye1X = x + eyeOffset;
                        eye1Y = y + eyeOffset;
                        eye2X = x + eyeOffset;
                        eye2Y = y + this.cellSize - eyeOffset - eyeSize;
                        break;
                    case 'right':
                        eye1X = x + this.cellSize - eyeOffset - eyeSize;
                        eye1Y = y + eyeOffset;
                        eye2X = x + this.cellSize - eyeOffset - eyeSize;
                        eye2Y = y + this.cellSize - eyeOffset - eyeSize;
                        break;
                }

                this.ctx.beginPath();
                this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#000';
                const pupilSize = 2;
                this.ctx.beginPath();
                this.ctx.arc(eye1X + eyeSize / 2, eye1Y + eyeSize / 2, pupilSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(eye2X + eyeSize / 2, eye2Y + eyeSize / 2, pupilSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                const alpha = 1 - (i / body.length) * 0.5;
                this.ctx.fillStyle = this.adjustAlpha(color, alpha);
                this.roundRect(x + 1, y + 1, size, size, radius);
                this.ctx.fill();
            }
        }

        this.ctx.globalAlpha = 1;
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    adjustAlpha(color, alpha) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    handleKeyPress(e) {
        if (!this.gameState || this.gameState.gameOver) return;

        let direction = null;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
        }

        if (direction) {
            e.preventDefault();
            this.sendMessage('direction', { direction: direction });
        }
    }

    handleRoomList(payload) {
        const container = document.getElementById('rooms-container');
        const roomListSection = document.getElementById('room-list');

        if (payload.rooms.length === 0) {
            roomListSection.classList.add('hidden');
            return;
        }

        roomListSection.classList.remove('hidden');
        container.innerHTML = '';

        for (const room of payload.rooms) {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.innerHTML = `
                <div>
                    <div class="room-name">${room.name}</div>
                    <div class="room-status">${room.status} | ${room.playerCount}/${room.maxPlayers} 玩家</div>
                </div>
            `;
            div.addEventListener('click', () => {
                document.getElementById('room-id').value = room.id;
                document.getElementById('join-room-form').classList.remove('hidden');
            });
            container.appendChild(div);
        }
    }

    copyInviteLink() {
        const inviteLink = document.getElementById('invite-link').textContent;
        navigator.clipboard.writeText(inviteLink).then(() => {
            this.showError('邀请链接已复制到剪贴板!');
        });
    }

    backToLobby() {
        if (this.ws) {
            this.ws.close();
        }
        this.showScreen('lobby-screen');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SnakeGameClient();
});
