class PerspectiveCorrector {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.image = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.dragIndex = -1;
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    }
    
    loadImage(img) {
        this.image = img;
        this.points = [];
        this.adjustCanvasSize();
        this.draw();
    }
    
    adjustCanvasSize() {
        if (!this.image) return;
        
        const maxWidth = 900;
        const maxHeight = 600;
        
        let width = this.image.width;
        let height = this.image.height;
        
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height *= ratio;
        }
        
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width *= ratio;
        }
        
        this.scale = width / this.image.width;
        this.canvas.width = width;
        this.canvas.height = height;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    
    handleClick(e) {
        if (this.points.length >= 4 || this.dragIndex !== -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;
        
        this.points.push({ x, y });
        this.draw();
    }
    
    handleMouseDown(e) {
        if (this.points.length < 4) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;
        
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(
                Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
            );
            
            if (distance < 15 / this.scale) {
                this.dragIndex = i;
                break;
            }
        }
    }
    
    handleMouseMove(e) {
        if (this.dragIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;
        
        this.points[this.dragIndex] = { x, y };
        this.draw();
    }
    
    handleMouseUp() {
        this.dragIndex = -1;
    }
    
    draw() {
        if (!this.image) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.image, 0, 0);
        this.ctx.restore();
        
        if (this.points.length > 0) {
            this.ctx.save();
            this.ctx.scale(this.scale, this.scale);
            
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2 / this.scale;
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            if (this.points.length === 4) {
                this.ctx.closePath();
                this.ctx.fill();
            }
            this.ctx.stroke();
            
            for (let i = 0; i < this.points.length; i++) {
                this.ctx.beginPath();
                this.ctx.arc(
                    this.points[i].x,
                    this.points[i].y,
                    8 / this.scale,
                    0,
                    Math.PI * 2
                );
                this.ctx.fillStyle = '#667eea';
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 2 / this.scale;
                this.ctx.stroke();
                
                this.ctx.fillStyle = 'white';
                this.ctx.font = `${12 / this.scale}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    (i + 1).toString(),
                    this.points[i].x,
                    this.points[i].y
                );
            }
            
            this.ctx.restore();
        }
    }
    
    resetPoints() {
        this.points = [];
        this.draw();
    }
    
    hasFourPoints() {
        return this.points.length === 4;
    }
    
    applyCorrection() {
        if (!this.hasFourPoints()) {
            throw new Error('请先标记四个角点');
        }
        
        const srcPoints = this.sortPoints(this.points);
        const { width, height } = this.calculateTargetSize(srcPoints);
        
        const dstPoints = [
            { x: 0, y: 0 },
            { x: width - 1, y: 0 },
            { x: width - 1, y: height - 1 },
            { x: 0, y: height - 1 }
        ];
        
        const matrix = this.computePerspectiveMatrix(srcPoints, dstPoints);
        return this.warpPerspective(matrix, width, height);
    }
    
    sortPoints(points) {
        const sorted = [...points];
        
        sorted.sort((a, b) => a.y - b.y);
        
        const topPoints = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPoints = sorted.slice(2).sort((a, b) => b.x - a.x);
        
        return [
            topPoints[0],
            topPoints[1],
            bottomPoints[0],
            bottomPoints[1]
        ];
    }
    
    calculateTargetSize(points) {
        const topWidth = this.distance(points[0], points[1]);
        const bottomWidth = this.distance(points[2], points[3]);
        const leftHeight = this.distance(points[0], points[3]);
        const rightHeight = this.distance(points[1], points[2]);
        
        return {
            width: Math.round(Math.max(topWidth, bottomWidth)),
            height: Math.round(Math.max(leftHeight, rightHeight))
        };
    }
    
    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
    }
    
    computePerspectiveMatrix(src, dst) {
        const a = [];
        
        for (let i = 0; i < 4; i++) {
            a.push([
                -src[i].x, -src[i].y, -1, 0, 0, 0,
                src[i].x * dst[i].x, src[i].y * dst[i].x, dst[i].x
            ]);
            a.push([
                0, 0, 0, -src[i].x, -src[i].y, -1,
                src[i].x * dst[i].y, src[i].y * dst[i].y, dst[i].y
            ]);
        }
        
        const m = this.gaussianElimination(a);
        
        return [
            [m[0], m[3], m[6]],
            [m[1], m[4], m[7]],
            [m[2], m[5], m[8] || 1]
        ];
    }
    
    gaussianElimination(a) {
        const n = a.length;
        
        for (let i = 0; i < n; i++) {
            let pivot = i;
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) {
                    pivot = j;
                }
            }
            
            [a[i], a[pivot]] = [a[pivot], a[i]];
            
            const div = a[i][i];
            for (let j = i; j <= n; j++) {
                a[i][j] /= div;
            }
            
            for (let j = 0; j < n; j++) {
                if (j !== i && Math.abs(a[j][i]) > 0) {
                    const factor = a[j][i];
                    for (let k = i; k <= n; k++) {
                        a[j][k] -= factor * a[i][k];
                    }
                }
            }
        }
        
        return a.map(row => row[n]);
    }
    
    warpPerspective(matrix, width, height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.image, 0, 0);
        
        const srcData = tempCtx.getImageData(
            0, 0, this.image.width, this.image.height
        );
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        const resultData = resultCtx.createImageData(width, height);
        
        const invMatrix = this.invertMatrix(matrix);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcCoords = this.applyMatrix(invMatrix, x, y);
                const sx = srcCoords.x;
                const sy = srcCoords.y;
                
                if (sx >= 0 && sx < this.image.width - 1 &&
                    sy >= 0 && sy < this.image.height - 1) {
                    
                    const pixel = this.bilinearInterpolate(
                        srcData, sx, sy, this.image.width
                    );
                    
                    const dstIndex = (y * width + x) * 4;
                    resultData.data[dstIndex] = pixel.r;
                    resultData.data[dstIndex + 1] = pixel.g;
                    resultData.data[dstIndex + 2] = pixel.b;
                    resultData.data[dstIndex + 3] = pixel.a;
                }
            }
        }
        
        resultCtx.putImageData(resultData, 0, 0);
        return resultCanvas;
    }
    
    applyMatrix(matrix, x, y) {
        const z = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
        return {
            x: (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / z,
            y: (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / z
        };
    }
    
    invertMatrix(m) {
        const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
                   m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
                   m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        
        if (det === 0) return m;
        
        const invDet = 1 / det;
        
        return [
            [
                (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
                (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
                (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet
            ],
            [
                (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
                (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
                (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet
            ],
            [
                (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
                (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
                (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet
            ]
        ];
    }
    
    bilinearInterpolate(imageData, x, y, width) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        
        const fx = x - x0;
        const fy = y - y0;
        
        const getPixel = (px, py) => {
            const index = (py * width + px) * 4;
            return {
                r: imageData.data[index],
                g: imageData.data[index + 1],
                b: imageData.data[index + 2],
                a: imageData.data[index + 3]
            };
        };
        
        const p00 = getPixel(x0, y0);
        const p10 = getPixel(x1, y0);
        const p01 = getPixel(x0, y1);
        const p11 = getPixel(x1, y1);
        
        const interpolate = (a, b, c, d, fx, fy) => {
            return a * (1 - fx) * (1 - fy) +
                   b * fx * (1 - fy) +
                   c * (1 - fx) * fy +
                   d * fx * fy;
        };
        
        return {
            r: Math.round(interpolate(p00.r, p10.r, p01.r, p11.r, fx, fy)),
            g: Math.round(interpolate(p00.g, p10.g, p01.g, p11.g, fx, fy)),
            b: Math.round(interpolate(p00.b, p10.b, p01.b, p11.b, fx, fy)),
            a: Math.round(interpolate(p00.a, p10.a, p01.a, p11.a, fx, fy))
        };
    }
}
