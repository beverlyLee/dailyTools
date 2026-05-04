class DrawingCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.strokes = [];
        this.currentStroke = null;
        this.history = [];
        this.penColor = '#000000';
        this.penWidth = 3;
        this.lastPoint = null;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.redraw();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            t: Date.now()
        };
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const point = this.getCanvasCoordinates(e);
        this.startStroke(point);
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const point = this.getCanvasCoordinates(e);
        this.drawSegment(point);
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.endStroke();
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length !== 1) return;
        
        this.isDrawing = true;
        const touch = e.touches[0];
        const point = this.getCanvasCoordinates(touch);
        this.startStroke(point);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const point = this.getCanvasCoordinates(touch);
        this.drawSegment(point);
    }
    
    handleTouchEnd(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.endStroke();
    }
    
    startStroke(point) {
        this.currentStroke = {
            x: [point.x],
            y: [point.y],
            t: [point.t],
            p: []
        };
        
        this.lastPoint = point;
        
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.strokeStyle = this.penColor;
        this.ctx.lineWidth = this.penWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.fillStyle = this.penColor;
        
        this.drawDot(point);
    }
    
    drawSegment(point) {
        if (!this.lastPoint) return;
        
        this.currentStroke.x.push(point.x);
        this.currentStroke.y.push(point.y);
        this.currentStroke.t.push(point.t);
        
        const x0 = this.lastPoint.x;
        const y0 = this.lastPoint.y;
        const x1 = point.x;
        const y1 = point.y;
        
        const dist = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        const steps = Math.max(1, Math.floor(dist / 2));
        
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.stroke();
        
        this.lastPoint = point;
    }
    
    drawDot(point) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, this.penWidth / 2, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    endStroke() {
        if (this.currentStroke && this.currentStroke.x.length > 0) {
            this.saveHistory();
            this.strokes.push(this.currentStroke);
        }
        this.currentStroke = null;
        this.lastPoint = null;
    }
    
    saveHistory() {
        const canvasState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push({
            strokes: JSON.parse(JSON.stringify(this.strokes)),
            canvasState: canvasState
        });
        
        if (this.history.length > 50) {
            this.history.shift();
        }
    }
    
    undo() {
        if (this.history.length === 0) return false;
        
        const previousState = this.history.pop();
        this.strokes = previousState.strokes;
        
        if (this.history.length === 0) {
            this.clear();
        } else {
            this.ctx.putImageData(previousState.canvasState, 0, 0);
        }
        
        return true;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), 
                          this.canvas.height / (window.devicePixelRatio || 1));
        this.strokes = [];
        this.history = [];
        this.currentStroke = null;
        this.lastPoint = null;
    }
    
    redraw() {
        if (this.strokes.length === 0) return;
        
        const savedStrokes = this.strokes;
        this.strokes = [];
        
        for (const stroke of savedStrokes) {
            if (stroke.x.length === 0) continue;
            
            const firstPoint = {
                x: stroke.x[0],
                y: stroke.y[0],
                t: stroke.t ? stroke.t[0] : Date.now()
            };
            
            this.startStroke(firstPoint);
            
            for (let i = 1; i < stroke.x.length; i++) {
                const point = {
                    x: stroke.x[i],
                    y: stroke.y[i],
                    t: stroke.t ? stroke.t[i] : Date.now()
                };
                this.drawSegment(point);
            }
            
            this.endStroke();
        }
    }
    
    getStrokesForRecognition() {
        return this.strokes.map(stroke => ({
            x: stroke.x,
            y: stroke.y,
            t: stroke.t || []
        }));
    }
    
    hasStrokes() {
        return this.strokes.length > 0;
    }
}
