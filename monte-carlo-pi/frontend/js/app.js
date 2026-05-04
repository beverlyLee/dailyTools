const API_BASE = '/api';

class MonteCarloPiApp {
    constructor() {
        this.canvas = document.getElementById('piCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.historyCanvas = document.getElementById('historyChart');
        this.historyCtx = this.historyCanvas.getContext('2d');
        
        this.totalPoints = 0;
        this.pointsInCircle = 0;
        this.pointsInSquare = 0;
        this.animationPoints = [];
        this.isAnimating = false;
        this.animationTimer = null;
        
        this.historyData = [];
        
        this.init();
    }

    init() {
        this.drawBackground();
        this.bindEvents();
        this.loadHistory();
    }

    drawBackground() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;

        this.ctx.clearRect(0, 0, width, height);

        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('蓝色: 正方形 (面积=4)', 10, 20);
        this.ctx.fillText('红色: 圆 (面积=π)', 10, 40);
    }

    drawPoint(x, y, inCircle) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;

        const canvasX = centerX + x * radius;
        const canvasY = centerY - y * radius;

        this.ctx.fillStyle = inCircle ? '#27ae60' : '#f39c12';
        this.ctx.beginPath();
        this.ctx.arc(canvasX, canvasY, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    clearPoints() {
        this.totalPoints = 0;
        this.pointsInCircle = 0;
        this.pointsInSquare = 0;
        this.animationPoints = [];
        this.updatePointDisplay();
        this.drawBackground();
    }

    updatePointDisplay() {
        document.getElementById('pointCount').textContent = `已投点: ${this.totalPoints.toLocaleString()}`;
        document.getElementById('circleCount').textContent = `圆内: ${this.pointsInCircle.toLocaleString()}`;
        document.getElementById('squareCount').textContent = `圆外: ${this.pointsInSquare.toLocaleString()}`;
    }

    async estimatePi() {
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        const workerCount = parseInt(document.getElementById('workerCount').value);
        const animationSpeed = parseInt(document.getElementById('animationSpeed').value);

        const startBtn = document.getElementById('startBtn');
        const originalText = startBtn.textContent;
        startBtn.disabled = true;
        startBtn.textContent = '计算中...';

        try {
            const response = await fetch(`${API_BASE}/estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sample_size: sampleSize,
                    num_workers: workerCount
                })
            });

            if (!response.ok) {
                throw new Error('估算失败');
            }

            const result = await response.json();
            this.displayResult(result);

            if (animationSpeed > 0) {
                await this.generateAndPlayAnimation(sampleSize, animationSpeed);
            } else {
                this.totalPoints = result.points_in_square;
                this.pointsInCircle = result.points_in_circle;
                this.pointsInSquare = result.points_in_square - result.points_in_circle;
                this.updatePointDisplay();
            }

            this.loadHistory();

        } catch (error) {
            alert('估算出错: ' + error.message);
        } finally {
            startBtn.disabled = false;
            startBtn.textContent = originalText;
        }
    }

    displayResult(result) {
        document.getElementById('estimatedPi').textContent = result.estimated_pi.toFixed(15);
        document.getElementById('actualPi').textContent = result.actual_pi.toFixed(15);
        document.getElementById('errorPercentage').textContent = 
            `${result.error_percentage.toFixed(6)}%`;
        document.getElementById('duration').textContent = `${result.duration_ms} ms`;
    }

    async generateAndPlayAnimation(totalCount, speed) {
        const displayCount = Math.min(totalCount, 1000);
        
        try {
            const response = await fetch(`${API_BASE}/sample-points?count=${displayCount}`);
            const points = await response.json();
            this.animationPoints = points;
            
            const ratio = totalCount / displayCount;
            let displayCircle = 0;
            let displaySquare = 0;
            
            this.isAnimating = true;
            this.drawBackground();
            this.totalPoints = 0;
            this.pointsInCircle = 0;
            this.pointsInSquare = 0;

            let index = 0;
            const animate = () => {
                if (index >= this.animationPoints.length || !this.isAnimating) {
                    this.totalPoints = totalCount;
                    this.pointsInCircle = Math.round(displayCircle * ratio);
                    this.pointsInSquare = totalCount - this.pointsInCircle;
                    this.updatePointDisplay();
                    this.isAnimating = false;
                    return;
                }

                const batchSize = Math.min(this.animationPoints.length - index, 10);
                for (let i = 0; i < batchSize && index < this.animationPoints.length; i++, index++) {
                    const point = this.animationPoints[index];
                    this.drawPoint(point.x, point.y, point.in_circle);
                    if (point.in_circle) {
                        displayCircle++;
                    } else {
                        displaySquare++;
                    }
                }

                this.totalPoints = Math.round(index * ratio);
                this.pointsInCircle = Math.round(displayCircle * ratio);
                this.pointsInSquare = this.totalPoints - this.pointsInCircle;
                this.updatePointDisplay();

                this.animationTimer = setTimeout(animate, speed);
            };

            animate();
        } catch (error) {
            console.error('生成动画点失败:', error);
        }
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }

    async loadHistory() {
        try {
            const response = await fetch(`${API_BASE}/history?limit=50`);
            const data = await response.json();
            this.historyData = data.data || [];
            this.renderHistoryTable();
            this.renderHistoryChart();
        } catch (error) {
            console.error('加载历史失败:', error);
        }
    }

    renderHistoryTable() {
        const tbody = document.getElementById('historyBody');
        
        if (this.historyData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">暂无历史数据</td></tr>';
            return;
        }

        tbody.innerHTML = this.historyData.map(record => `
            <tr>
                <td>${new Date(record.created_at).toLocaleString('zh-CN')}</td>
                <td>${record.sample_size.toLocaleString()}</td>
                <td class="highlight">${record.estimated_pi.toFixed(10)}</td>
                <td class="${record.error_percentage < 1 ? 'success' : 'warning'}">
                    ${record.error_percentage.toFixed(4)}%
                </td>
                <td>${record.duration_ms} ms</td>
            </tr>
        `).join('');
    }

    renderHistoryChart() {
        const width = this.historyCanvas.width;
        const height = this.historyCanvas.height;
        const ctx = this.historyCtx;

        ctx.clearRect(0, 0, width, height);

        if (this.historyData.length === 0) {
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '14px Arial';
            ctx.fillText('暂无数据', width / 2 - 30, height / 2);
            return;
        }

        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const sortedData = [...this.historyData].sort((a, b) => a.sample_size - b.sample_size);
        
        const minPi = Math.PI * 0.9;
        const maxPi = Math.PI * 1.1;

        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        const piY = padding + chartHeight * (1 - (Math.PI - minPi) / (maxPi - minPi));
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, piY);
        ctx.lineTo(width - padding, piY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px Arial';
        ctx.fillText(`π = ${Math.PI.toFixed(6)}`, width - padding - 100, piY - 5);

        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();

        sortedData.forEach((record, index) => {
            const x = padding + (chartWidth * index / Math.max(sortedData.length - 1, 1));
            const y = padding + chartHeight * (1 - (record.estimated_pi - minPi) / (maxPi - minPi));
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        ctx.fillStyle = '#27ae60';
        sortedData.forEach((record, index) => {
            const x = padding + (chartWidth * index / Math.max(sortedData.length - 1, 1));
            const y = padding + chartHeight * (1 - (record.estimated_pi - minPi) / (maxPi - minPi));
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('样本量 (越大越右)', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('估算 π 值', 0, 0);
        ctx.restore();

        ctx.textAlign = 'left';
    }

    async clearHistory() {
        if (!confirm('确定要清除所有历史记录吗？')) {
            return;
        }

        try {
            await fetch(`${API_BASE}/history`, { method: 'DELETE' });
            this.historyData = [];
            this.renderHistoryTable();
            this.renderHistoryChart();
        } catch (error) {
            console.error('清除历史失败:', error);
        }
    }

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.estimatePi());
        document.getElementById('animateBtn').addEventListener('click', () => {
            if (this.isAnimating) {
                this.stopAnimation();
                document.getElementById('animateBtn').textContent = '播放动画';
            } else {
                const animationSpeed = parseInt(document.getElementById('animationSpeed').value);
                if (animationSpeed > 0 && this.animationPoints.length > 0) {
                    this.isAnimating = true;
                    document.getElementById('animateBtn').textContent = '停止动画';
                    this.replayAnimation(animationSpeed);
                }
            }
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.stopAnimation();
            this.clearPoints();
            document.getElementById('estimatedPi').textContent = '--';
            document.getElementById('errorPercentage').textContent = '--';
            document.getElementById('duration').textContent = '--';
            document.getElementById('animateBtn').textContent = '播放动画';
        });
        document.getElementById('loadHistoryBtn').addEventListener('click', () => this.loadHistory());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
    }

    replayAnimation(speed) {
        if (this.animationPoints.length === 0) {
            return;
        }

        this.drawBackground();
        let index = 0;
        let circleCount = 0;
        let squareCount = 0;

        const animate = () => {
            if (index >= this.animationPoints.length || !this.isAnimating) {
                this.isAnimating = false;
                document.getElementById('animateBtn').textContent = '播放动画';
                return;
            }

            const batchSize = Math.min(this.animationPoints.length - index, 10);
            for (let i = 0; i < batchSize && index < this.animationPoints.length; i++, index++) {
                const point = this.animationPoints[index];
                this.drawPoint(point.x, point.y, point.in_circle);
                if (point.in_circle) {
                    circleCount++;
                } else {
                    squareCount++;
                }
            }

            this.pointsInCircle = circleCount;
            this.pointsInSquare = squareCount;
            this.totalPoints = circleCount + squareCount;
            this.updatePointDisplay();

            this.animationTimer = setTimeout(animate, speed);
        };

        animate();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MonteCarloPiApp();
});
