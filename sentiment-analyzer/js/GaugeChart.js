class GaugeChart {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.currentAngle = -Math.PI;
        this.targetAngle = -Math.PI;
        this.animationProgress = 0;
        
        this.width = 400;
        this.height = 280;
        this.centerX = 200;
        this.centerY = 220;
        this.radius = 150;
        
        this.colors = {
            negative: '#eb3349',
            neutral: '#667eea',
            positive: '#11998e',
            background: '#e0e0e0',
            needle: '#333',
            needleCenter: '#667eea'
        };
    }

    init() {
        this.canvas = document.getElementById('gaugeChart');
        if (!this.canvas) {
            console.warn('未找到 gaugeChart canvas 元素');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.drawEmptyGauge();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth;
        const scale = Math.min(maxWidth / this.width, 1);
        
        this.canvas.width = this.width * scale;
        this.canvas.height = this.height * scale;
        this.ctx.scale(scale, scale);
    }

    drawEmptyGauge() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        this.drawScale();
        this.drawLabels();
        this.drawNeedle(0);
    }

    update(result) {
        if (!this.canvas) {
            this.init();
        }
        
        if (!this.ctx) return;
        
        const angle = this.calculateAngle(result);
        this.targetAngle = angle;
        this.animationProgress = 0;
        this.startAnimation();
    }

    calculateAngle(result) {
        const { positive, negative, neutral } = result;
        
        const sentimentScore = positive - negative;
        const normalizedScore = (sentimentScore + 1) / 2;
        
        const startAngle = -Math.PI;
        const endAngle = 0;
        const angleRange = endAngle - startAngle;
        
        return startAngle + normalizedScore * angleRange;
    }

    startAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const duration = 1500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            this.animationProgress = Math.min(elapsed / duration, 1);
            
            const easedProgress = this.easeOutCubic(this.animationProgress);
            const currentAngle = this.lerp(this.currentAngle, this.targetAngle, easedProgress);
            
            this.draw(currentAngle);
            
            if (this.animationProgress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.currentAngle = this.targetAngle;
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    draw(angle) {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        this.drawColoredArc(angle);
        this.drawScale();
        this.drawLabels();
        this.drawNeedle(angle);
    }

    drawBackground() {
        const ctx = this.ctx;
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, Math.PI, 0, false);
        ctx.fillStyle = '#f5f5f5';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, Math.PI, 0, false);
        ctx.strokeStyle = this.colors.background;
        ctx.lineWidth = 25;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    drawColoredArc(angle) {
        const ctx = this.ctx;
        const innerRadius = this.radius - 35;
        
        const segments = [
            { start: Math.PI, end: Math.PI * 2/3, color: this.colors.negative, label: '负面' },
            { start: Math.PI * 2/3, end: Math.PI * 1/3, color: this.colors.neutral, label: '中性' },
            { start: Math.PI * 1/3, end: 0, color: this.colors.positive, label: '正面' }
        ];
        
        for (const segment of segments) {
            const segmentMid = (segment.start + segment.end) / 2;
            
            let drawEnd;
            if (angle <= segment.start && angle >= segment.end) {
                drawEnd = Math.PI - angle;
            } else if (angle < segment.end) {
                drawEnd = segment.end;
            } else {
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.radius, Math.PI - segment.start, Math.PI - drawEnd, false);
            ctx.strokeStyle = segment.color;
            ctx.lineWidth = 25;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        for (const segment of segments) {
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, innerRadius, Math.PI - segment.start, Math.PI - segment.end, false);
            ctx.strokeStyle = segment.color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    drawScale() {
        const ctx = this.ctx;
        const tickCount = 11;
        const innerRadius = this.radius - 45;
        const outerRadius = this.radius - 30;
        
        for (let i = 0; i <= tickCount; i++) {
            const angle = Math.PI + (i / tickCount) * Math.PI;
            const innerX = this.centerX + innerRadius * Math.cos(angle);
            const innerY = this.centerY + innerRadius * Math.sin(angle);
            const outerX = this.centerX + outerRadius * Math.cos(angle);
            const outerY = this.centerY + outerRadius * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = i % 5 === 0 ? 2 : 1;
            ctx.stroke();
        }
    }

    drawLabels() {
        const ctx = this.ctx;
        const labelRadius = this.radius - 60;
        
        const labels = [
            { angle: Math.PI, text: '-100%', color: this.colors.negative },
            { angle: Math.PI * 0.75, text: '负面', color: this.colors.negative },
            { angle: Math.PI * 0.5, text: '0%', color: this.colors.neutral },
            { angle: Math.PI * 0.25, text: '正面', color: this.colors.positive },
            { angle: 0, text: '+100%', color: this.colors.positive }
        ];
        
        for (const label of labels) {
            const x = this.centerX + labelRadius * Math.cos(Math.PI - label.angle);
            const y = this.centerY + labelRadius * Math.sin(Math.PI - label.angle);
            
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = label.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label.text, x, y);
        }
    }

    drawNeedle(angle) {
        const ctx = this.ctx;
        const needleLength = this.radius - 50;
        const needleWidth = 8;
        
        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, -needleWidth / 2);
        ctx.lineTo(needleLength, 0);
        ctx.lineTo(0, needleWidth / 2);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, needleLength, 0);
        gradient.addColorStop(0, this.colors.needle);
        gradient.addColorStop(1, '#666');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 15, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.needleCenter;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.needle;
        ctx.fill();
    }

    clear() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.currentAngle = -Math.PI;
        this.targetAngle = -Math.PI;
        this.animationProgress = 0;
        
        if (this.ctx) {
            this.drawEmptyGauge();
        }
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.canvas = null;
        this.ctx = null;
    }
}
