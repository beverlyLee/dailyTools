import { ThreeBodyScene } from './ThreeBodyScene.js';
import { ThreeBodyAPI } from './api.js';

class ThreeBodySimulator {
    constructor() {
        this.scene = null;
        this.isRunning = false;
        this.isPaused = false;
        this.simulationSpeed = 10;
        this.simulationInterval = null;
        this.presets = [];
        this.currentSimulationId = null;
        
        this.init();
    }

    async init() {
        try {
            const container = document.getElementById('canvas-container');
            this.scene = new ThreeBodyScene(container);
            
            await this.loadPresets();
            this.setupUI();
            this.initializeDefaultBodies();
            
            document.getElementById('loading-overlay').classList.add('hidden');
            
        } catch (error) {
            console.error('Failed to initialize:', error);
            alert('初始化失败: ' + error.message);
        }
    }

    async loadPresets() {
        try {
            const response = await ThreeBodyAPI.getPresets();
            this.presets = response.presets || [];
            this.renderPresets();
        } catch (error) {
            console.error('Failed to load presets:', error);
            this.presets = this.getDefaultPresets();
            this.renderPresets();
        }
    }

    getDefaultPresets() {
        return [
            {
                name: "Sun-Earth-Moon System",
                description: "Simplified solar system with three bodies",
                bodies: [
                    { name: "Sun", mass: 1.989e30, position: [0, 0, 0], velocity: [0, 0, 0] },
                    { name: "Earth", mass: 5.972e24, position: [1.496e11, 0, 0], velocity: [0, 29783, 0] },
                    { name: "Moon", mass: 7.342e22, position: [1.496e11 + 3.844e8, 0, 0], velocity: [0, 29783 + 1022, 0] }
                ]
            },
            {
                name: "Equal Mass Triangular",
                description: "Three equal masses in equilateral triangle configuration",
                bodies: [
                    { name: "Body A", mass: 1e24, position: [1e11, 0, 0], velocity: [0, 1e4, 0] },
                    { name: "Body B", mass: 1e24, position: [-5e10, 8.66e10, 0], velocity: [-8660, -5000, 0] },
                    { name: "Body C", mass: 1e24, position: [-5e10, -8.66e10, 0], velocity: [8660, -5000, 0] }
                ]
            },
            {
                name: "Chaotic Configuration",
                description: "A configuration likely to exhibit chaotic behavior",
                bodies: [
                    { name: "Heavy Body", mass: 2e30, position: [0, 0, 0], velocity: [0, 0, 0] },
                    { name: "Light Body 1", mass: 1e24, position: [1e11, 0, 0], velocity: [0, 2e4, 1e4] },
                    { name: "Light Body 2", mass: 1e24, position: [-1e11, 5e10, 0], velocity: [1e4, -2e4, 5e3] }
                ]
            }
        ];
    }

    renderPresets() {
        const container = document.getElementById('preset-buttons');
        container.innerHTML = '';
        
        this.presets.forEach((preset, index) => {
            const btn = document.createElement('div');
            btn.className = 'preset-btn';
            btn.innerHTML = `
                <div class="preset-name">${preset.name}</div>
                <div class="preset-desc">${preset.description}</div>
            `;
            btn.addEventListener('click', () => this.loadPreset(index));
            container.appendChild(btn);
        });
    }

    loadPreset(index) {
        const preset = this.presets[index];
        if (!preset) return;
        
        preset.bodies.forEach((body, i) => {
            this.setBodyConfig(i, body);
        });
        
        this.stopSimulation();
    }

    initializeDefaultBodies() {
        const defaultBodies = [
            {
                name: "天体 1",
                mass: 1e30,
                position: [0, 0, 0],
                velocity: [0, 0, 0]
            },
            {
                name: "天体 2",
                mass: 5e29,
                position: [1.5e11, 0, 0],
                velocity: [0, 2e4, 0]
            },
            {
                name: "天体 3",
                mass: 1e29,
                position: [-1e11, 5e10, 0],
                velocity: [1e4, -1e4, 0]
            }
        ];

        defaultBodies.forEach((body, i) => {
            this.setBodyConfig(i, body);
        });

        this.renderBodyConfigs();
    }

    setupUI() {
        document.getElementById('btn-init').addEventListener('click', () => this.initializeSimulation());
        document.getElementById('btn-start').addEventListener('click', () => this.startSimulation());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetSimulation());
        
        document.getElementById('btn-save').addEventListener('click', () => this.showSaveModal());
        document.getElementById('btn-load-history').addEventListener('click', () => this.showHistoryModal());
        document.getElementById('btn-analyze').addEventListener('click', () => this.analyzeSimulation());
        
        document.getElementById('btn-cancel-save').addEventListener('click', () => this.hideSaveModal());
        document.getElementById('btn-confirm-save').addEventListener('click', () => this.saveSimulation());
        document.getElementById('btn-close-history').addEventListener('click', () => this.hideHistoryModal());
        
        const speedSlider = document.getElementById('speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = `${this.simulationSpeed}x`;
        });
        
        document.getElementById('show-trajectory').addEventListener('change', (e) => {
            this.scene.toggleTrajectories(e.target.checked);
        });

        this.renderBodyConfigs();
    }

    renderBodyConfigs() {
        const container = document.getElementById('body-configs');
        container.innerHTML = '';
        
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
        
        for (let i = 0; i < 3; i++) {
            const config = document.createElement('div');
            config.className = 'body-config';
            config.innerHTML = `
                <div class="body-header">
                    <div>
                        <span class="body-indicator" style="background-color: ${colors[i]}"></span>
                        <span class="body-name" id="body-${i}-name">天体 ${i + 1}</span>
                    </div>
                </div>
                <div class="form-group">
                    <label>名称</label>
                    <input type="text" id="body-${i}-name-input" value="天体 ${i + 1}" placeholder="天体名称">
                </div>
                <div class="form-group">
                    <label>质量 (kg)</label>
                    <input type="number" id="body-${i}-mass" value="1e30" step="1e20" min="0">
                </div>
                <div class="form-group">
                    <label>位置 (m)</label>
                    <div class="vector-inputs">
                        <div class="form-group">
                            <label>X</label>
                            <input type="number" id="body-${i}-pos-x" value="${i === 0 ? 0 : (i === 1 ? 1.5e11 : -1e11)}" step="1e10">
                        </div>
                        <div class="form-group">
                            <label>Y</label>
                            <input type="number" id="body-${i}-pos-y" value="0" step="1e10">
                        </div>
                        <div class="form-group">
                            <label>Z</label>
                            <input type="number" id="body-${i}-pos-z" value="0" step="1e10">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>速度 (m/s)</label>
                    <div class="vector-inputs">
                        <div class="form-group">
                            <label>Vx</label>
                            <input type="number" id="body-${i}-vel-x" value="0" step="1e3">
                        </div>
                        <div class="form-group">
                            <label>Vy</label>
                            <input type="number" id="body-${i}-vel-y" value="${i === 1 ? 2e4 : (i === 2 ? -1e4 : 0)}" step="1e3">
                        </div>
                        <div class="form-group">
                            <label>Vz</label>
                            <input type="number" id="body-${i}-vel-z" value="0" step="1e3">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(config);
        }
    }

    getBodyConfig(index) {
        return {
            name: document.getElementById(`body-${index}-name-input`).value || `天体 ${index + 1}`,
            mass: parseFloat(document.getElementById(`body-${index}-mass`).value) || 1e30,
            position: [
                parseFloat(document.getElementById(`body-${index}-pos-x`).value) || 0,
                parseFloat(document.getElementById(`body-${index}-pos-y`).value) || 0,
                parseFloat(document.getElementById(`body-${index}-pos-z`).value) || 0
            ],
            velocity: [
                parseFloat(document.getElementById(`body-${index}-vel-x`).value) || 0,
                parseFloat(document.getElementById(`body-${index}-vel-y`).value) || 0,
                parseFloat(document.getElementById(`body-${index}-vel-z`).value) || 0
            ]
        };
    }

    setBodyConfig(index, data) {
        const nameInput = document.getElementById(`body-${index}-name-input`);
        const massInput = document.getElementById(`body-${index}-mass`);
        const nameDisplay = document.getElementById(`body-${index}-name`);
        
        if (nameInput) nameInput.value = data.name || `天体 ${index + 1}`;
        if (nameDisplay) nameDisplay.textContent = data.name || `天体 ${index + 1}`;
        if (massInput) massInput.value = data.mass || 1e30;
        
        if (data.position) {
            const posX = document.getElementById(`body-${index}-pos-x`);
            const posY = document.getElementById(`body-${index}-pos-y`);
            const posZ = document.getElementById(`body-${index}-pos-z`);
            if (posX) posX.value = data.position[0] || 0;
            if (posY) posY.value = data.position[1] || 0;
            if (posZ) posZ.value = data.position[2] || 0;
        }
        
        if (data.velocity) {
            const velX = document.getElementById(`body-${index}-vel-x`);
            const velY = document.getElementById(`body-${index}-vel-y`);
            const velZ = document.getElementById(`body-${index}-vel-z`);
            if (velX) velX.value = data.velocity[0] || 0;
            if (velY) velY.value = data.velocity[1] || 0;
            if (velZ) velZ.value = data.velocity[2] || 0;
        }
    }

    async initializeSimulation() {
        try {
            const dt = parseFloat(document.getElementById('dt-input').value) || 1.0;
            
            const bodies = [];
            for (let i = 0; i < 3; i++) {
                bodies.push(this.getBodyConfig(i));
            }

            const response = await ThreeBodyAPI.initializeSimulation({
                bodies: bodies,
                dt: dt
            });

            this.scene.initializeBodies(response.initial_state.bodies);
            
            document.getElementById('btn-start').disabled = false;
            this.updateStatus('ready');
            this.updateStats(0, 0);

        } catch (error) {
            console.error('Failed to initialize:', error);
            alert('初始化失败: ' + error.message);
        }
    }

    startSimulation() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-pause').disabled = false;
        document.getElementById('btn-pause').textContent = '暂停';
        
        this.updateStatus('running');
        
        this.runSimulationLoop();
    }

    async runSimulationLoop() {
        if (!this.isRunning || this.isPaused) return;

        try {
            const steps = Math.max(1, Math.min(100, this.simulationSpeed));
            const response = await ThreeBodyAPI.runSimulationStep(steps);
            
            this.scene.updateBodies(response.snapshot);
            this.updateStats(response.current_time, response.steps_executed);

            this.simulationInterval = setTimeout(() => this.runSimulationLoop(), 16);
            
        } catch (error) {
            console.error('Simulation error:', error);
            this.stopSimulation();
            alert('模拟错误: ' + error.message);
        }
    }

    togglePause() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.getElementById('btn-pause').textContent = '继续';
            this.updateStatus('paused');
        } else {
            document.getElementById('btn-pause').textContent = '暂停';
            this.updateStatus('running');
            this.runSimulationLoop();
        }
    }

    stopSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.simulationInterval) {
            clearTimeout(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-pause').disabled = true;
        document.getElementById('btn-pause').textContent = '暂停';
        
        this.updateStatus('idle');
    }

    async resetSimulation() {
        try {
            this.stopSimulation();
            
            await ThreeBodyAPI.resetSimulation();
            
            this.scene.clearBodies();
            this.scene.clearTrajectories();
            
            this.updateStats(0, 0);
            this.updateStatus('idle');
            
        } catch (error) {
            console.error('Reset failed:', error);
            alert('重置失败: ' + error.message);
        }
    }

    updateStatus(status) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        statusDot.className = 'status-dot';
        
        switch (status) {
            case 'running':
                statusDot.classList.add('status-running');
                statusText.textContent = '运行中';
                break;
            case 'paused':
                statusDot.classList.add('status-paused');
                statusText.textContent = '已暂停';
                break;
            case 'ready':
                statusDot.classList.add('status-idle');
                statusText.textContent = '已就绪';
                break;
            default:
                statusDot.classList.add('status-idle');
                statusText.textContent = '空闲';
        }
    }

    updateStats(time, steps) {
        document.getElementById('current-time').textContent = `${time.toFixed(1)} s`;
        document.getElementById('data-points').textContent = steps;
    }

    showSaveModal() {
        document.getElementById('save-modal').classList.remove('hidden');
        document.getElementById('save-name').value = `模拟_${new Date().toLocaleString()}`;
        document.getElementById('save-notes').value = '';
    }

    hideSaveModal() {
        document.getElementById('save-modal').classList.add('hidden');
    }

    async saveSimulation() {
        try {
            const name = document.getElementById('save-name').value || '未命名模拟';
            const notes = document.getElementById('save-notes').value || '';
            
            const response = await ThreeBodyAPI.saveSimulation(name, notes);
            this.currentSimulationId = response.simulation_id;
            
            this.hideSaveModal();
            alert(`模拟已保存! ID: ${response.simulation_id}`);
            
        } catch (error) {
            console.error('Save failed:', error);
            alert('保存失败: ' + error.message);
        }
    }

    async showHistoryModal() {
        try {
            const response = await ThreeBodyAPI.getAllSimulations(50);
            const container = document.getElementById('history-list');
            container.innerHTML = '';
            
            if (response.simulations && response.simulations.length > 0) {
                response.simulations.forEach(sim => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <div class="history-name">${sim.simulation_name}</div>
                        <div class="history-time">${sim.created_at} | 总时间: ${sim.total_time.toFixed(1)}s</div>
                    `;
                    item.addEventListener('click', () => this.loadSimulation(sim));
                    container.appendChild(item);
                });
            } else {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">暂无历史记录</div>';
            }
            
            document.getElementById('history-modal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Load history failed:', error);
            alert('加载历史记录失败: ' + error.message);
        }
    }

    hideHistoryModal() {
        document.getElementById('history-modal').classList.add('hidden');
    }

    async loadSimulation(simData) {
        try {
            this.stopSimulation();
            
            const fullData = await ThreeBodyAPI.getSimulation(simData.id);
            
            simData.initial_bodies.forEach((body, i) => {
                this.setBodyConfig(i, body);
            });
            
            this.scene.initializeBodies(simData.initial_bodies);
            
            if (fullData.trajectory_data && fullData.trajectory_data.length > 0) {
                this.scene.loadTrajectories(fullData.trajectory_data);
                const lastSnapshot = fullData.trajectory_data[fullData.trajectory_data.length - 1];
                this.scene.updateBodies(lastSnapshot);
                this.updateStats(lastSnapshot.time, fullData.trajectory_data.length);
            }
            
            this.currentSimulationId = simData.id;
            this.hideHistoryModal();
            document.getElementById('btn-start').disabled = false;
            
        } catch (error) {
            console.error('Load simulation failed:', error);
            alert('加载模拟失败: ' + error.message);
        }
    }

    async analyzeSimulation() {
        if (!this.currentSimulationId) {
            alert('请先保存模拟数据后再进行分析');
            return;
        }

        try {
            const analysis = await ThreeBodyAPI.analyzeSimulation(this.currentSimulationId);
            this.displayAnalysis(analysis);
        } catch (error) {
            console.error('Analysis failed:', error);
            alert('分析失败: ' + error.message);
        }
    }

    displayAnalysis(analysis) {
        const container = document.getElementById('analysis-result');
        container.style.display = 'block';
        
        let html = `
            <div style="margin-bottom: 10px; color: #88ffaa; font-weight: 600;">
                分析结果: ${analysis.simulation_name}
            </div>
            <div style="font-size: 11px; color: #888; margin-bottom: 10px;">
                总时间: ${analysis.total_time.toFixed(2)}s | 时间步长: ${analysis.dt}s
            </div>
        `;

        for (const [bodyName, data] of Object.entries(analysis.body_analysis)) {
            html += `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(136, 255, 170, 0.05); border-radius: 4px;">
                    <div style="color: #88ffaa; font-weight: 600; margin-bottom: 8px;">${bodyName}</div>
                    <div class="analysis-item">
                        <div class="analysis-label">稳定性估计</div>
                        <div class="analysis-value" style="color: ${data.stability_estimate === 'stable' ? '#88ffaa' : '#ff8888'}">
                            ${data.stability_estimate === 'stable' ? '稳定' : '不稳定'}
                        </div>
                    </div>
                    <div class="analysis-item">
                        <div class="analysis-label">总位移</div>
                        <div class="analysis-value">${data.displacement_magnitude.toExponential(2)} m</div>
                    </div>
                    <div class="analysis-item">
                        <div class="analysis-label">最大距离</div>
                        <div class="analysis-value">${data.max_distance_from_origin.toExponential(2)} m</div>
                    </div>
                    <div class="analysis-item">
                        <div class="analysis-label">最小距离</div>
                        <div class="analysis-value">${data.min_distance_from_origin.toExponential(2)} m</div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ThreeBodySimulator();
});
