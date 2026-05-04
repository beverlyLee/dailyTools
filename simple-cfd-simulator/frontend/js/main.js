class CFDSimulator {
    constructor() {
        this.apiBase = '/api/simulation';
        this.simulationId = null;
        this.isRunning = false;
        this.animationId = null;
        this.currentStep = 0;
        this.gridWidth = 0;
        this.gridHeight = 0;
        
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        this.initEventListeners();
        this.initColorMap();
    }
    
    initEventListeners() {
        document.getElementById('initBtn').addEventListener('click', () => this.initSimulation());
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('snapshotBtn').addEventListener('click', () => this.saveSnapshot());
        document.getElementById('loadSnapshotBtn').addEventListener('click', () => this.showSnapshotModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideSnapshotModal());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadSelectedSnapshot());
        
        document.getElementById('obstacleType').addEventListener('change', (e) => {
            const circleParams = ['circleParams', 'radiusGroup'];
            const rectParams = ['rectangleParams', 'heightGroup'];
            
            if (e.target.value === 'circle') {
                circleParams.forEach(id => document.getElementById(id).classList.remove('hidden'));
                rectParams.forEach(id => document.getElementById(id).classList.add('hidden'));
            } else {
                circleParams.forEach(id => document.getElementById(id).classList.add('hidden'));
                rectParams.forEach(id => document.getElementById(id).classList.remove('hidden'));
            }
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    initColorMap() {
        this.colorMap = new ImageData(256, 1);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;
            
            if (t < 0.25) {
                const nt = t / 0.25;
                r = 0;
                g = 0;
                b = Math.floor(128 + 127 * nt);
            } else if (t < 0.5) {
                const nt = (t - 0.25) / 0.25;
                r = 0;
                g = Math.floor(255 * nt);
                b = 255;
            } else if (t < 0.75) {
                const nt = (t - 0.5) / 0.25;
                r = Math.floor(255 * nt);
                g = 255;
                b = Math.floor(255 * (1 - nt));
            } else {
                const nt = (t - 0.75) / 0.25;
                r = 255;
                g = Math.floor(255 * (1 - nt));
                b = 0;
            }
            
            this.colorMap.data[i * 4] = r;
            this.colorMap.data[i * 4 + 1] = g;
            this.colorMap.data[i * 4 + 2] = b;
            this.colorMap.data[i * 4 + 3] = 255;
        }
    }
    
    getColor(value, minValue, maxValue) {
        const normalized = (value - minValue) / (maxValue - minValue);
        const clamped = Math.max(0, Math.min(1, normalized));
        const index = Math.floor(clamped * 255);
        
        return {
            r: this.colorMap.data[index * 4],
            g: this.colorMap.data[index * 4 + 1],
            b: this.colorMap.data[index * 4 + 2]
        };
    }
    
    async initSimulation() {
        const params = {
            reynolds_number: parseFloat(document.getElementById('reynoldsNumber').value),
            inlet_velocity: parseFloat(document.getElementById('inletVelocity').value),
            grid_width: parseInt(document.getElementById('gridWidth').value),
            grid_height: parseInt(document.getElementById('gridHeight').value),
            obstacle_type: document.getElementById('obstacleType').value,
            obstacle_x: parseInt(document.getElementById('obstacleX').value),
            obstacle_y: parseInt(document.getElementById('obstacleY').value)
        };
        
        if (params.obstacle_type === 'circle') {
            params.obstacle_radius = parseInt(document.getElementById('obstacleRadius').value);
        } else {
            params.obstacle_width = parseInt(document.getElementById('obstacleWidth').value);
            params.obstacle_height = parseInt(document.getElementById('obstacleHeight').value);
        }
        
        try {
            const response = await fetch(`${this.apiBase}/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.simulationId = result.simulation_id;
                this.gridWidth = params.grid_width;
                this.gridHeight = params.grid_height;
                this.currentStep = 0;
                
                this.setupCanvas();
                this.updateUIState('initialized');
                this.updateStatusDisplay();
                
                console.log('Simulation initialized:', this.simulationId);
            } else {
                alert('初始化失败: ' + (result.detail || '未知错误'));
            }
        } catch (error) {
            console.error('Error initializing simulation:', error);
            alert('初始化失败: ' + error.message);
        }
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(container.clientWidth - 60, 1000);
        const aspectRatio = this.gridWidth / this.gridHeight;
        
        this.canvas.width = this.gridWidth;
        this.canvas.height = this.gridHeight;
        
        this.canvas.style.width = `${maxWidth}px`;
        this.canvas.style.height = `${maxWidth / aspectRatio}px`;
        
        this.renderPlaceholder();
    }
    
    renderPlaceholder() {
        const imageData = this.ctx.createImageData(this.gridWidth, this.gridHeight);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = 20;
            imageData.data[i + 1] = 20;
            imageData.data[i + 2] = 40;
            imageData.data[i + 3] = 255;
        }
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    async startSimulation() {
        if (!this.simulationId) return;
        
        this.isRunning = true;
        this.updateUIState('running');
        this.animationLoop();
    }
    
    async pauseSimulation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updateUIState('paused');
    }
    
    async resetSimulation() {
        if (!this.simulationId) return;
        
        try {
            const response = await fetch(`${this.apiBase}/reset/${this.simulationId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentStep = 0;
                this.isRunning = false;
                this.updateUIState('initialized');
                this.renderPlaceholder();
                this.updateStatusDisplay();
                console.log('Simulation reset');
            }
        } catch (error) {
            console.error('Error resetting simulation:', error);
        }
    }
    
    async saveSnapshot() {
        if (!this.simulationId) return;
        
        try {
            const response = await fetch(`${this.apiBase}/step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    simulation_id: this.simulationId,
                    steps: 0,
                    save_snapshot: true
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('快照已保存！当前步数: ' + this.currentStep);
            }
        } catch (error) {
            console.error('Error saving snapshot:', error);
            alert('保存快照失败: ' + error.message);
        }
    }
    
    async showSnapshotModal() {
        try {
            const response = await fetch(`${this.apiBase}/list`);
            const result = await response.json();
            
            const select = document.getElementById('snapshotSelect');
            select.innerHTML = '';
            
            if (result.simulations && result.simulations.length > 0) {
                for (const sim of result.simulations) {
                    try {
                        const snapResponse = await fetch(`${this.apiBase}/snapshots/${sim.id}`);
                        const snapResult = await snapResponse.json();
                        
                        if (snapResult.snapshots && snapResult.snapshots.length > 0) {
                            for (const snap of snapResult.snapshots) {
                                const option = document.createElement('option');
                                option.value = snap.id;
                                option.textContent = `模拟 #${sim.id} - 步数 ${snap.step} (${snap.time_stamp})`;
                                select.appendChild(option);
                            }
                        }
                    } catch (e) {
                        console.error('Error loading snapshots for simulation', sim.id, e);
                    }
                }
            }
            
            if (select.options.length === 0) {
                const option = document.createElement('option');
                option.textContent = '没有可用的快照';
                option.disabled = true;
                select.appendChild(option);
            }
            
            document.getElementById('snapshotModal').classList.add('show');
        } catch (error) {
            console.error('Error loading snapshots:', error);
            alert('加载快照失败: ' + error.message);
        }
    }
    
    hideSnapshotModal() {
        document.getElementById('snapshotModal').classList.remove('show');
    }
    
    async loadSelectedSnapshot() {
        const select = document.getElementById('snapshotSelect');
        const snapshotId = select.value;
        
        if (!snapshotId || select.options[select.selectedIndex].disabled) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/snapshot/${snapshotId}`);
            const result = await response.json();
            
            if (result.success) {
                this.gridWidth = result.grid_width;
                this.gridHeight = result.grid_height;
                this.setupCanvas();
                
                if (result.vorticity) {
                    const vorticity = new Float32Array(result.vorticity.length);
                    for (let i = 0; i < result.vorticity.length; i++) {
                        vorticity[i] = result.vorticity[i];
                    }
                    this.renderVorticity(vorticity);
                }
                
                this.hideSnapshotModal();
                alert('快照已加载！');
            }
        } catch (error) {
            console.error('Error loading snapshot:', error);
            alert('加载快照失败: ' + error.message);
        }
    }
    
    async animationLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        this.frameCount++;
        
        if (now - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
            this.updateStatusDisplay();
        }
        
        try {
            const stepsPerFrame = parseInt(document.getElementById('stepsPerFrame').value) || 10;
            
            const response = await fetch(`${this.apiBase}/step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    simulation_id: this.simulationId,
                    steps: stepsPerFrame,
                    save_snapshot: false
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentStep = result.current_step;
                
                const renderMode = document.getElementById('renderMode').value;
                const vectorDensity = parseInt(document.getElementById('vectorDensity').value) || 8;
                
                if (result.vorticity && (renderMode === 'vorticity' || renderMode === 'both')) {
                    const vorticity = new Float32Array(result.vorticity.length);
                    for (let i = 0; i < result.vorticity.length; i++) {
                        vorticity[i] = result.vorticity[i];
                    }
                    this.renderVorticity(vorticity);
                }
                
                if (result.velocity && (renderMode === 'velocity' || renderMode === 'both')) {
                    const velocity = new Float32Array(result.velocity.length);
                    for (let i = 0; i < result.velocity.length; i++) {
                        velocity[i] = result.velocity[i];
                    }
                    
                    if (renderMode === 'velocity') {
                        this.renderVelocityBackground();
                    }
                    this.renderVelocityVectors(velocity, vectorDensity);
                }
                
                if (result.obstacle) {
                    const obstacle = new Int32Array(result.obstacle.length);
                    for (let i = 0; i < result.obstacle.length; i++) {
                        obstacle[i] = result.obstacle[i];
                    }
                    this.renderObstacles(obstacle);
                }
                
                this.updateStatusDisplay();
            }
        } catch (error) {
            console.error('Error in animation loop:', error);
            this.isRunning = false;
            this.updateUIState('paused');
        }
        
        if (this.isRunning) {
            this.animationId = requestAnimationFrame(() => this.animationLoop());
        }
    }
    
    renderVorticity(vorticity) {
        const imageData = this.ctx.createImageData(this.gridWidth, this.gridHeight);
        
        let maxVort = -Infinity;
        let minVort = Infinity;
        
        for (let i = 0; i < vorticity.length; i++) {
            const val = vorticity[i];
            if (Math.abs(val) > 0.001) {
                maxVort = Math.max(maxVort, val);
                minVort = Math.min(minVort, val);
            }
        }
        
        const range = Math.max(Math.abs(maxVort), Math.abs(minVort), 0.01);
        maxVort = range;
        minVort = -range;
        
        document.getElementById('maxValue').textContent = maxVort.toFixed(3);
        document.getElementById('minValue').textContent = minVort.toFixed(3);
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const idx = y * this.gridWidth + x;
                const pixelIdx = (y * this.gridWidth + x) * 4;
                const val = vorticity[idx];
                
                const color = this.getColor(val, minVort, maxVort);
                
                imageData.data[pixelIdx] = color.r;
                imageData.data[pixelIdx + 1] = color.g;
                imageData.data[pixelIdx + 2] = color.b;
                imageData.data[pixelIdx + 3] = 255;
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    renderVelocityBackground() {
        const imageData = this.ctx.createImageData(this.gridWidth, this.gridHeight);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = 20;
            imageData.data[i + 1] = 20;
            imageData.data[i + 2] = 40;
            imageData.data[i + 3] = 255;
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    renderVelocityVectors(velocity, density) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 1;
        
        const maxSpeed = 0.5;
        
        for (let y = 0; y < this.gridHeight; y += density) {
            for (let x = 0; x < this.gridWidth; x += density) {
                const idx = (y * this.gridWidth + x) * 2;
                const vx = velocity[idx];
                const vy = velocity[idx + 1];
                
                const speed = Math.sqrt(vx * vx + vy * vy);
                
                if (speed > 0.001) {
                    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
                    const arrowLength = density * 0.8 * normalizedSpeed;
                    
                    const angle = Math.atan2(vy, vx);
                    const endX = x + Math.cos(angle) * arrowLength;
                    const endY = y + Math.sin(angle) * arrowLength;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(endX, endY);
                    this.ctx.stroke();
                    
                    const headLength = Math.min(arrowLength * 0.3, 4);
                    const headAngle1 = angle + Math.PI * 0.75;
                    const headAngle2 = angle - Math.PI * 0.75;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(endX, endY);
                    this.ctx.lineTo(
                        endX + Math.cos(headAngle1) * headLength,
                        endY + Math.sin(headAngle1) * headLength
                    );
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(endX, endY);
                    this.ctx.lineTo(
                        endX + Math.cos(headAngle2) * headLength,
                        endY + Math.sin(headAngle2) * headLength
                    );
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.restore();
    }
    
    renderObstacles(obstacle) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const idx = y * this.gridWidth + x;
                if (obstacle[idx] === 1) {
                    this.ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        this.ctx.restore();
    }
    
    updateUIState(state) {
        const initBtn = document.getElementById('initBtn');
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const snapshotBtn = document.getElementById('snapshotBtn');
        const statusEl = document.getElementById('status');
        
        switch (state) {
            case 'initialized':
                initBtn.disabled = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                resetBtn.disabled = false;
                snapshotBtn.disabled = false;
                statusEl.textContent = '已初始化';
                statusEl.className = 'status-paused';
                break;
                
            case 'running':
                initBtn.disabled = true;
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                resetBtn.disabled = true;
                snapshotBtn.disabled = true;
                statusEl.textContent = '运行中';
                statusEl.className = 'status-running';
                break;
                
            case 'paused':
                initBtn.disabled = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                resetBtn.disabled = false;
                snapshotBtn.disabled = false;
                statusEl.textContent = '已暂停';
                statusEl.className = 'status-paused';
                break;
                
            default:
                initBtn.disabled = false;
                startBtn.disabled = true;
                pauseBtn.disabled = true;
                resetBtn.disabled = true;
                snapshotBtn.disabled = true;
                statusEl.textContent = '空闲';
                statusEl.className = 'status-idle';
        }
    }
    
    updateStatusDisplay() {
        document.getElementById('simulationId').textContent = this.simulationId || '-';
        document.getElementById('currentStep').textContent = this.currentStep;
        document.getElementById('fps').textContent = this.fps;
    }
    
    resizeCanvas() {
        if (this.gridWidth > 0 && this.gridHeight > 0) {
            this.setupCanvas();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const simulator = new CFDSimulator();
    window.simulator = simulator;
});
