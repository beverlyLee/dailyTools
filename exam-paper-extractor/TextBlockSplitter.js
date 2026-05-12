class TextBlockSplitter {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.image = null;
        this.sourceCanvas = null;
        this.blocks = [];
        this.scale = 1;
        this.gapThreshold = 20;
        this.minBlockHeight = 50;
    }
    
    loadImage(canvasOrImg) {
        this.sourceCanvas = document.createElement('canvas');
        const sourceCtx = this.sourceCanvas.getContext('2d');
        
        let sourceWidth, sourceHeight;
        let isCanvas = false;
        
        if (canvasOrImg instanceof HTMLCanvasElement) {
            isCanvas = true;
            sourceWidth = canvasOrImg.width;
            sourceHeight = canvasOrImg.height;
        } else {
            sourceWidth = canvasOrImg.naturalWidth || canvasOrImg.width || 0;
            sourceHeight = canvasOrImg.naturalHeight || canvasOrImg.height || 0;
        }
        
        if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
            return;
        }
        
        this.sourceCanvas.width = sourceWidth;
        this.sourceCanvas.height = sourceHeight;
        
        sourceCtx.fillStyle = '#ff0000';
        sourceCtx.fillRect(0, 0, 100, 100);
        
        if (isCanvas) {
            sourceCtx.drawImage(canvasOrImg, 0, 0, sourceWidth, sourceHeight);
        } else {
            if (canvasOrImg.complete && (canvasOrImg.naturalWidth > 0 || canvasOrImg.width > 0)) {
                sourceCtx.drawImage(canvasOrImg, 0, 0, sourceWidth, sourceHeight);
            } else {
                const self = this;
                canvasOrImg.onload = function() {
                    const w = canvasOrImg.naturalWidth || canvasOrImg.width;
                    const h = canvasOrImg.naturalHeight || canvasOrImg.height;
                    
                    self.sourceCanvas.width = w;
                    self.sourceCanvas.height = h;
                    
                    const sCtx = self.sourceCanvas.getContext('2d');
                    sCtx.drawImage(canvasOrImg, 0, 0, w, h);
                    
                    self.image = {
                        width: w,
                        height: h
                    };
                    
                    self.blocks = [];
                    self.adjustCanvasSize();
                    self.draw();
                };
                return;
            }
        }
        
        this.image = {
            width: sourceWidth,
            height: sourceHeight
        };
        
        this.blocks = [];
        this.adjustCanvasSize();
        this.draw();
    }
    
    adjustCanvasSize() {
        if (!this.image || !this.image.width || !this.image.height) {
            return;
        }
        
        const maxWidth = 900;
        const maxHeight = 600;
        
        let width = this.image.width;
        let height = this.image.height;
        
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
        }
        
        this.scale = width / this.image.width;
        
        if (!isFinite(this.scale) || this.scale <= 0) {
            this.scale = 1;
        }
        
        this.canvas.width = Math.max(1, Math.floor(width));
        this.canvas.height = Math.max(1, Math.floor(height));
    }
    
    draw() {
        if (!this.image || !this.sourceCanvas) {
            return;
        }
        if (!this.canvas.width || !this.canvas.height) {
            return;
        }
        if (!this.sourceCanvas.width || !this.sourceCanvas.height) {
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.sourceCanvas, 0, 0);
        this.ctx.restore();
        
        if (this.blocks.length > 0) {
            this.drawBlocks();
        }
    }
    
    drawBlocks() {
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(block.x, block.y, block.width, block.height);
            
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
            const labelWidth = 35;
            const labelHeight = 25;
            this.ctx.fillRect(block.x, block.y, labelWidth, labelHeight);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                (i + 1).toString(),
                block.x + labelWidth / 2,
                block.y + labelHeight / 2
            );
        }
        
        this.ctx.restore();
    }
    
    setGapThreshold(value) {
        this.gapThreshold = value;
    }
    
    setMinBlockHeight(value) {
        this.minBlockHeight = value;
    }
    
    split() {
        if (!this.image || !this.sourceCanvas) {
            throw new Error('请先加载图片');
        }
        
        if (!this.image.width || !this.image.height) {
            throw new Error('图像尺寸无效');
        }
        
        const imageData = this.getImageData();
        const grayData = this.toGrayscale(imageData);
        const binaryData = this.binarize(grayData);
        
        const horizontalProjection = this.computeHorizontalProjection(
            binaryData,
            this.image.width,
            this.image.height
        );
        
        const lines = this.findTextLines(
            horizontalProjection,
            this.image.height
        );
        
        this.blocks = this.groupLinesIntoBlocks(lines);
        
        if (this.blocks.length === 0) {
            this.blocks = this.createFallbackBlocks();
        }
        
        this.blocks = this.refineBlocks(
            binaryData,
            this.image.width,
            this.image.height
        );
        
        this.draw();
        
        return this.blocks.map(block => this.extractBlockImage(block));
    }
    
    getImageData() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.sourceCanvas, 0, 0);
        return tempCtx.getImageData(0, 0, this.image.width, this.image.height);
    }
    
    toGrayscale(imageData) {
        const gray = new Float32Array(imageData.width * imageData.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            
            gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
        
        return gray;
    }
    
    binarize(grayData) {
        const threshold = this.otsuThreshold(grayData);
        const binary = new Uint8Array(grayData.length);
        
        for (let i = 0; i < grayData.length; i++) {
            binary[i] = grayData[i] < threshold ? 1 : 0;
        }
        
        return binary;
    }
    
    otsuThreshold(grayData) {
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < grayData.length; i++) {
            const value = Math.max(0, Math.min(255, Math.round(grayData[i])));
            histogram[value]++;
        }
        
        const total = grayData.length;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let varMax = 0;
        let threshold = 128;
        
        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            
            wF = total - wB;
            if (wF === 0) break;
            
            sumB += t * histogram[t];
            
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            
            const varBetween = wB * wF * (mB - mF) * (mB - mF);
            
            if (varBetween > varMax) {
                varMax = varMax;
                threshold = t;
            }
        }
        
        return Math.max(50, Math.min(200, threshold));
    }
    
    computeHorizontalProjection(binaryData, width, height) {
        const projection = new Int32Array(height);
        
        for (let y = 0; y < height; y++) {
            let count = 0;
            for (let x = 0; x < width; x++) {
                count += binaryData[y * width + x];
            }
            projection[y] = count;
        }
        
        return projection;
    }
    
    findTextLines(projection, height) {
        const lines = [];
        let inLine = false;
        let lineStart = 0;
        
        const maxProjection = Math.max(...projection);
        const threshold = Math.max(1, maxProjection * 0.05);
        
        for (let y = 0; y < height; y++) {
            const isText = projection[y] > threshold;
            
            if (isText && !inLine) {
                inLine = true;
                lineStart = y;
            } else if (!isText && inLine) {
                inLine = false;
                const lineEnd = y;
                
                if (lineEnd - lineStart >= 3) {
                    lines.push({
                        top: lineStart,
                        bottom: lineEnd,
                        height: lineEnd - lineStart
                    });
                }
            }
        }
        
        if (inLine) {
            lines.push({
                top: lineStart,
                bottom: height,
                height: height - lineStart
            });
        }
        
        return lines;
    }
    
    createFallbackBlocks() {
        const blocks = [];
        const blockHeight = Math.max(this.minBlockHeight, Math.floor(this.image.height / 5));
        
        let y = 0;
        
        while (y < this.image.height) {
            const height = Math.min(blockHeight, this.image.height - y);
            if (height >= this.minBlockHeight) {
                blocks.push({
                    x: 0,
                    y: y,
                    width: this.image.width,
                    height: height,
                    lines: []
                });
            }
            y += blockHeight + 10;
        }
        
        return blocks;
    }
    
    groupLinesIntoBlocks(lines) {
        if (lines.length === 0) return [];
        
        const blocks = [];
        let currentBlock = {
            lines: [lines[0]],
            top: lines[0].top,
            bottom: lines[0].bottom
        };
        
        const avgLineHeight = lines.reduce((sum, line) => sum + line.height, 0) / lines.length;
        const dynamicGapThreshold = Math.max(this.gapThreshold, avgLineHeight * 0.5);
        
        for (let i = 1; i < lines.length; i++) {
            const gap = lines[i].top - lines[i - 1].bottom;
            
            if (gap >= dynamicGapThreshold) {
                blocks.push(this.createBlockFromLines(currentBlock.lines));
                currentBlock = {
                    lines: [lines[i]],
                    top: lines[i].top,
                    bottom: lines[i].bottom
                };
            } else {
                currentBlock.lines.push(lines[i]);
                currentBlock.bottom = lines[i].bottom;
            }
        }
        
        blocks.push(this.createBlockFromLines(currentBlock.lines));
        
        return blocks.filter(block => block.height >= this.minBlockHeight);
    }
    
    createBlockFromLines(lines) {
        const top = Math.max(0, lines[0].top - 15);
        const bottom = Math.min(this.image.height, lines[lines.length - 1].bottom + 15);
        
        return {
            x: 0,
            y: top,
            width: this.image.width,
            height: bottom - top,
            lines: lines
        };
    }
    
    refineBlocks(binaryData, width, height) {
        return this.blocks.map(block => {
            const verticalProjection = this.computeVerticalProjection(
                binaryData,
                width,
                block
            );
            
            const refinedX = this.findLeftBoundary(verticalProjection, width);
            const refinedRight = this.findRightBoundaryPosition(
                verticalProjection,
                width,
                refinedX
            );
            
            const newX = Math.max(0, refinedX - 20);
            const newWidth = Math.max(10, Math.min(width - newX, refinedRight - refinedX + 40));
            
            return {
                x: newX,
                y: block.y,
                width: newWidth,
                height: block.height,
                lines: block.lines
            };
        });
    }
    
    findRightBoundaryPosition(projection, width, startX) {
        const maxProjection = Math.max(...projection);
        const threshold = Math.max(1, maxProjection * 0.05);
        
        for (let x = width - 1; x >= startX; x--) {
            if (projection[x] > threshold) {
                return x;
            }
        }
        
        return width - 1;
    }
    
    computeVerticalProjection(binaryData, width, block) {
        const projection = new Int32Array(width);
        const padding = 5;
        
        const startY = Math.max(0, block.y + padding);
        const endY = Math.min(this.image.height, block.y + block.height - padding);
        
        for (let x = 0; x < width; x++) {
            let count = 0;
            
            for (let y = startY; y < endY; y++) {
                count += binaryData[y * width + x];
            }
            
            projection[x] = count;
        }
        
        return projection;
    }
    
    findLeftBoundary(projection, width) {
        const maxProjection = Math.max(...projection);
        const threshold = Math.max(1, maxProjection * 0.05);
        
        for (let x = 0; x < width; x++) {
            if (projection[x] > threshold) {
                return x;
            }
        }
        
        return 0;
    }
    
    findRightBoundary(projection, width, startX) {
        const maxProjection = Math.max(...projection);
        const threshold = Math.max(1, maxProjection * 0.05);
        
        for (let x = width - 1; x >= startX; x--) {
            if (projection[x] > threshold) {
                return x - startX;
            }
        }
        
        return width - startX;
    }
    
    extractBlockImage(block) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = block.width;
        tempCanvas.height = block.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(
            this.sourceCanvas,
            block.x,
            block.y,
            block.width,
            block.height,
            0,
            0,
            block.width,
            block.height
        );
        
        return {
            canvas: tempCanvas,
            width: block.width,
            height: block.height,
            selected: false
        };
    }
    
    getBlocks() {
        return this.blocks;
    }
}
