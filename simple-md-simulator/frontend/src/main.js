import { MDRenderer } from './renderer.js';
import { api } from './api.js';

class MDApp {
    constructor() {
        this.simulationId = null;
        this.initialEnergy = null;
        this.isRunning = false;
        this.animationFrameId = null;
        this.energyHistory = [];
        this.boxSize = 0;
        this.numAtoms = 0;
        
        this.playbackMode = false;
        this.playbackData = null;
        this.playbackFrame = 0;
        this.isPlayingBack = false;
        this.playbackInterval = null;
        
        this.init();
    }
    
    init() {
        const canvasContainer = document.getElementById('canvas-container');
        this.renderer = new MDRenderer(canvasContainer);
        
        this.bindEvents();
        this.checkBackendHealth();
    }
    
    bindEvents() {
        document.getElementById('create-simulation-btn').addEventListener('click', () => this.createSimulation());
        document.getElementById('close-simulation-btn').addEventListener('click', () => this.closeSimulation());
        
        document.getElementById('start-btn').addEventListener('click', () => this.startSimulation());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('step-btn').addEventListener('click', () => this.stepSimulation());
        
        document.getElementById('scale-temp-btn').addEventListener('click', () => this.scaleTemperature());
        
        document.getElementById('refresh-trajectories-btn').addEventListener('click', () => this.refreshTrajectories());
        document.getElementById('stop-playback-btn').addEventListener('click', () => this.stopPlayback());
        document.getElementById('play-playback-btn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('playback-slider').addEventListener('input', (e) => this.setPlaybackFrame(parseInt(e.target.value)));
    }
    
    async checkBackendHealth() {
        try {
            await api.healthCheck();
            console.log('Backend is running');
        } catch (e) {
            console.warn('Backend not reachable. Please start the backend server first.');
        }
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
    
    async createSimulation() {
        if (this.playbackMode) {
            this.stopPlayback();
        }
        
        const config = {
            n_unit_cells: parseInt(document.getElementById('lattice-size').value),
            density: parseFloat(document.getElementById('density').value),
            temperature: parseFloat(document.getElementById('temperature').value),
            timestep: parseFloat(document.getElementById('timestep').value),
            seed: 42,
        };
        
        this.showLoading(true);
        
        try {
            const result = await api.createSimulation(config);
            this.simulationId = result.simulation_id;
            this.boxSize = result.system_info.box_size;
            this.numAtoms = result.system_info.n_atoms;
            this.initialEnergy = result.initial_state.total_energy;
            this.energyHistory = [];
            
            this.renderer.createAtoms(result.initial_state.positions, this.boxSize);
            
            this.updateSystemInfo(result.system_info);
            this.updateStateDisplay(result.initial_state);
            this.showSimulationControls(true);
            
            document.getElementById('create-simulation-btn').classList.add('hidden');
            document.getElementById('close-simulation-btn').classList.remove('hidden');
            
            this.updateStatus('模拟已创建', `ID: ${this.simulationId}`);
            
        } catch (e) {
            alert(`创建模拟失败: ${e.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async closeSimulation() {
        if (this.isRunning) {
            this.pauseSimulation();
        }
        
        if (this.simulationId) {
            try {
                await api.closeSimulation(this.simulationId);
            } catch (e) {
                console.warn('Failed to close simulation:', e);
            }
        }
        
        this.simulationId = null;
        this.initialEnergy = null;
        this.energyHistory = [];
        
        this.renderer.clearAtoms();
        this.showSimulationControls(false);
        
        document.getElementById('create-simulation-btn').classList.remove('hidden');
        document.getElementById('close-simulation-btn').classList.add('hidden');
        
        this.updateStatus('模拟已关闭', '');
    }
    
    async startSimulation() {
        if (!this.simulationId) return;
        
        this.isRunning = true;
        document.getElementById('start-btn').classList.add('hidden');
        document.getElementById('pause-btn').classList.remove('hidden');
        
        this.runSimulationLoop();
    }
    
    async runSimulationLoop() {
        if (!this.isRunning) return;
        
        const stepsPerFrame = parseInt(document.getElementById('steps-per-frame').value);
        
        try {
            const result = await api.stepSimulation(this.simulationId, stepsPerFrame);
            this.updateStateDisplay(result.state);
            this.renderer.updateAtomPositions(result.state.positions);
            
            this.energyHistory.push({
                step: result.state.step,
                pe: result.state.potential_energy,
                ke: result.state.kinetic_energy,
                te: result.state.total_energy,
            });
            
            this.updateEnergyChart();
            
        } catch (e) {
            console.error('Simulation step failed:', e);
            this.isRunning = false;
            document.getElementById('start-btn').classList.remove('hidden');
            document.getElementById('pause-btn').classList.add('hidden');
            return;
        }
        
        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame(() => this.runSimulationLoop());
        }
    }
    
    pauseSimulation() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        document.getElementById('start-btn').classList.remove('hidden');
        document.getElementById('pause-btn').classList.add('hidden');
    }
    
    async stepSimulation() {
        if (!this.simulationId) return;
        
        if (this.isRunning) {
            this.pauseSimulation();
        }
        
        try {
            const result = await api.stepSimulation(this.simulationId, 1);
            this.updateStateDisplay(result.state);
            this.renderer.updateAtomPositions(result.state.positions);
            
            this.energyHistory.push({
                step: result.state.step,
                pe: result.state.potential_energy,
                ke: result.state.kinetic_energy,
                te: result.state.total_energy,
            });
            
            this.updateEnergyChart();
            
        } catch (e) {
            alert(`单步执行失败: ${e.message}`);
        }
    }
    
    async scaleTemperature() {
        if (!this.simulationId) return;
        
        const targetTemp = parseFloat(document.getElementById('target-temp').value);
        
        try {
            const result = await api.scaleTemperature(this.simulationId, targetTemp);
            
            const stateResult = await api.getSimulationState(this.simulationId);
            this.updateStateDisplay(stateResult.state);
            this.renderer.updateAtomPositions(stateResult.state.positions);
            
        } catch (e) {
            alert(`温度缩放失败: ${e.message}`);
        }
    }
    
    updateSystemInfo(info) {
        document.getElementById('stat-num-atoms').textContent = info.n_atoms;
        document.getElementById('stat-box-size').textContent = info.box_size.toFixed(3);
        document.getElementById('stat-density').textContent = info.density.toFixed(3);
    }
    
    updateStateDisplay(state) {
        document.getElementById('stat-step').textContent = state.step;
        document.getElementById('stat-time').textContent = state.time.toFixed(4);
        document.getElementById('stat-temp').textContent = state.temperature.toFixed(6);
        document.getElementById('stat-pressure').textContent = state.pressure.toFixed(6);
        document.getElementById('stat-pe').textContent = state.potential_energy.toFixed(6);
        document.getElementById('stat-ke').textContent = state.kinetic_energy.toFixed(6);
        document.getElementById('stat-te').textContent = state.total_energy.toFixed(6);
        
        if (this.initialEnergy && this.initialEnergy !== 0) {
            const error = Math.abs((state.total_energy - this.initialEnergy) / this.initialEnergy) * 100;
            const errorElem = document.getElementById('stat-error');
            errorElem.textContent = error.toFixed(6) + '%';
            errorElem.className = 'stat-value ' + (error < 0.1 ? 'good' : error < 1.0 ? 'warning' : '');
        }
    }
    
    updateEnergyChart() {
        if (this.energyHistory.length < 2) return;
        
        const chartContainer = document.getElementById('energy-chart');
        chartContainer.innerHTML = '';
        
        const width = chartContainer.clientWidth;
        const height = chartContainer.clientHeight;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        const maxPoints = 100;
        const data = this.energyHistory.length > maxPoints 
            ? this.energyHistory.slice(-maxPoints) 
            : this.energyHistory;
        
        const allValues = data.flatMap(d => [d.pe, d.ke, d.te]);
        const minVal = Math.min(...allValues);
        const maxVal = Math.max(...allValues);
        const range = maxVal - minVal || 1;
        
        const padding = 10;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const drawLine = (values, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            
            values.forEach((v, i) => {
                const x = padding + (i / (values.length - 1)) * chartWidth;
                const y = padding + chartHeight - ((v - minVal) / range) * chartHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        };
        
        drawLine(data.map(d => d.pe), '#f44336');
        drawLine(data.map(d => d.ke), '#4caf50');
        drawLine(data.map(d => d.te), '#2196f3');
    }
    
    showSimulationControls(show) {
        const controls = ['simulation-controls', 'current-state-panel', 'energy-chart-panel'];
        controls.forEach(id => {
            const elem = document.getElementById(id);
            if (show) {
                elem.classList.remove('hidden');
            } else {
                elem.classList.add('hidden');
            }
        });
    }
    
    updateStatus(title, info) {
        const statusBar = document.getElementById('status-bar');
        const statusTitle = document.getElementById('simulation-status');
        const statusInfo = document.getElementById('simulation-info');
        
        if (title) {
            statusTitle.textContent = title;
            statusInfo.textContent = info || '';
            statusBar.classList.remove('hidden');
        } else {
            statusBar.classList.add('hidden');
        }
    }
    
    async refreshTrajectories() {
        const listContainer = document.getElementById('trajectory-list');
        
        try {
            const result = await api.listSavedSimulations();
            
            if (result.simulations.length === 0) {
                listContainer.innerHTML = '<p style="color: #808080; font-size: 12px;">暂无保存的轨迹</p>';
                return;
            }
            
            listContainer.innerHTML = result.simulations.map(sim => `
                <div class="trajectory-item" data-id="${sim.id}">
                    <div class="trajectory-name">${sim.name || `模拟 #${sim.id}`}</div>
                    <div class="trajectory-info">
                        ${sim.num_atoms} 原子 | ${sim.created_at ? new Date(sim.created_at).toLocaleString() : ''}
                    </div>
                </div>
            `).join('');
            
            listContainer.querySelectorAll('.trajectory-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.id);
                    this.loadTrajectory(id);
                });
            });
            
        } catch (e) {
            listContainer.innerHTML = `<p style="color: #f44336; font-size: 12px;">加载失败: ${e.message}</p>`;
        }
    }
    
    async loadTrajectory(dbId) {
        if (this.isRunning) {
            this.pauseSimulation();
        }
        
        this.showLoading(true);
        
        try {
            const info = await api.getSavedSimulationInfo(dbId);
            const frames = await api.getSavedFrames(dbId);
            
            this.playbackData = {
                info: info.simulation,
                frames: frames.frames,
                dbId: dbId,
            };
            
            this.playbackMode = true;
            this.playbackFrame = 0;
            
            this.boxSize = frames.box_size;
            this.numAtoms = frames.num_atoms;
            
            const firstFrame = await api.getSavedFrameDetails(dbId, frames.frames[0].frame_number);
            const positions = firstFrame.atoms.map(a => a.position);
            
            this.renderer.createAtoms(positions, this.boxSize);
            
            document.getElementById('playback-panel').classList.remove('hidden');
            document.getElementById('stop-playback-btn').classList.remove('hidden');
            
            const slider = document.getElementById('playback-slider');
            slider.min = 0;
            slider.max = frames.frames.length - 1;
            slider.value = 0;
            
            this.updatePlaybackFrameDisplay();
            this.updateStatus('轨迹回放', frames.frames.length + ' 帧');
            
            document.querySelectorAll('.trajectory-item').forEach(item => {
                item.classList.toggle('active', parseInt(item.dataset.id) === dbId);
            });
            
        } catch (e) {
            alert(`加载轨迹失败: ${e.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async setPlaybackFrame(frameIdx) {
        if (!this.playbackData) return;
        
        this.playbackFrame = frameIdx;
        const frameNumber = this.playbackData.frames[frameIdx].frame_number;
        
        try {
            const frameData = await api.getSavedFrameDetails(this.playbackData.dbId, frameNumber);
            const positions = frameData.atoms.map(a => a.position);
            
            this.renderer.updateAtomPositions(positions);
            this.updatePlaybackFrameDisplay();
            
        } catch (e) {
            console.error('Failed to load frame:', e);
        }
    }
    
    updatePlaybackFrameDisplay() {
        const slider = document.getElementById('playback-slider');
        const frameDisplay = document.getElementById('playback-frame');
        
        slider.value = this.playbackFrame;
        frameDisplay.textContent = `${this.playbackFrame + 1}/${this.playbackData?.frames.length || 0}`;
        
        if (this.playbackData && this.playbackData.frames[this.playbackFrame]) {
            const frame = this.playbackData.frames[this.playbackFrame];
            document.getElementById('stat-step').textContent = frame.frame_number;
            document.getElementById('stat-time').textContent = frame.time.toFixed(4);
            document.getElementById('stat-temp').textContent = frame.temperature.toFixed(6);
            document.getElementById('stat-pressure').textContent = frame.pressure.toFixed(6);
            document.getElementById('stat-pe').textContent = frame.potential_energy.toFixed(6);
            document.getElementById('stat-ke').textContent = frame.kinetic_energy.toFixed(6);
            document.getElementById('stat-te').textContent = frame.total_energy.toFixed(6);
            document.getElementById('stat-error').textContent = '-';
        }
    }
    
    togglePlayback() {
        if (!this.playbackData) return;
        
        const btn = document.getElementById('play-playback-btn');
        
        if (this.isPlayingBack) {
            this.isPlayingBack = false;
            btn.textContent = '▶';
            if (this.playbackInterval) {
                clearInterval(this.playbackInterval);
                this.playbackInterval = null;
            }
        } else {
            this.isPlayingBack = true;
            btn.textContent = '⏸';
            
            this.playbackInterval = setInterval(async () => {
                if (!this.isPlayingBack) return;
                
                this.playbackFrame++;
                if (this.playbackFrame >= this.playbackData.frames.length) {
                    this.playbackFrame = 0;
                }
                
                await this.setPlaybackFrame(this.playbackFrame);
            }, 100);
        }
    }
    
    stopPlayback() {
        this.playbackMode = false;
        this.playbackData = null;
        
        if (this.isPlayingBack) {
            this.isPlayingBack = false;
            document.getElementById('play-playback-btn').textContent = '▶';
            if (this.playbackInterval) {
                clearInterval(this.playbackInterval);
                this.playbackInterval = null;
            }
        }
        
        document.getElementById('playback-panel').classList.add('hidden');
        document.getElementById('stop-playback-btn').classList.add('hidden');
        
        this.renderer.clearAtoms();
        
        document.querySelectorAll('.trajectory-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.simulationId) {
            this.updateStatus('模拟已暂停', `ID: ${this.simulationId}`);
        } else {
            this.updateStatus('', '');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MDApp();
});
