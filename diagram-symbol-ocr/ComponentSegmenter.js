export class ComponentSegmenter {
    constructor(options = {}) {
        this.options = {
            minArea: options.minArea || 100,
            maxArea: options.maxArea || 50000,
            threshold: options.threshold || 128,
            invert: options.invert !== false
        };
    }

    segment(imageSource) {
        const canvas = this.toCanvas(imageSource);
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const binaryData = this.threshold(data, width, height);
        const labels = this.connectedComponents(binaryData, width, height);
        
        const components = this.extractComponents(labels, width, height);
        
        return {
            canvas: canvas,
            width: width,
            height: height,
            components: components
        };
    }

    toCanvas(source) {
        if (source instanceof HTMLCanvasElement) {
            return source;
        }
        
        const canvas = document.createElement('canvas');
        if (source instanceof HTMLImageElement) {
            canvas.width = source.naturalWidth;
            canvas.height = source.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source, 0, 0);
        }
        return canvas;
    }

    threshold(data, width, height) {
        const binary = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                
                let value;
                if (this.options.invert) {
                    value = gray < this.options.threshold ? 1 : 0;
                } else {
                    value = gray >= this.options.threshold ? 1 : 0;
                }
                
                binary[y * width + x] = value;
            }
        }
        
        return binary;
    }

    connectedComponents(binary, width, height) {
        const labels = new Int32Array(width * height);
        let nextLabel = 1;
        const link = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (binary[y * width + x] === 1) {
                    const neighbors = this.getNeighbors(labels, x, y, width);
                    
                    if (neighbors.length === 0) {
                        labels[y * width + x] = nextLabel;
                        link[nextLabel] = nextLabel;
                        nextLabel++;
                    } else {
                        const minLabel = Math.min(...neighbors);
                        labels[y * width + x] = minLabel;
                        
                        neighbors.forEach(label => {
                            if (label !== minLabel) {
                                this.union(link, minLabel, label);
                            }
                        });
                    }
                }
            }
        }
        
        for (let i = 1; i < nextLabel; i++) {
            link[i] = this.findRoot(link, i);
        }
        
        const remap = {};
        let newLabel = 1;
        for (let i = 1; i < nextLabel; i++) {
            const root = link[i];
            if (!remap[root]) {
                remap[root] = newLabel++;
            }
        }
        
        for (let i = 0; i < labels.length; i++) {
            if (labels[i] !== 0) {
                labels[i] = remap[link[labels[i]]];
            }
        }
        
        return labels;
    }

    getNeighbors(labels, x, y, width) {
        const neighbors = [];
        
        if (x > 0) {
            const left = labels[y * width + x - 1];
            if (left !== 0) neighbors.push(left);
        }
        
        if (y > 0) {
            const top = labels[(y - 1) * width + x];
            if (top !== 0) neighbors.push(top);
        }
        
        if (x > 0 && y > 0) {
            const topLeft = labels[(y - 1) * width + x - 1];
            if (topLeft !== 0) neighbors.push(topLeft);
        }
        
        if (x < width - 1 && y > 0) {
            const topRight = labels[(y - 1) * width + x + 1];
            if (topRight !== 0) neighbors.push(topRight);
        }
        
        return [...new Set(neighbors)];
    }

    findRoot(link, label) {
        if (link[label] !== label) {
            link[label] = this.findRoot(link, link[label]);
        }
        return link[label];
    }

    union(link, a, b) {
        const rootA = this.findRoot(link, a);
        const rootB = this.findRoot(link, b);
        if (rootA !== rootB) {
            link[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
        }
    }

    extractComponents(labels, width, height) {
        const components = {};
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const label = labels[y * width + x];
                if (label === 0) continue;
                
                if (!components[label]) {
                    components[label] = {
                        label: label,
                        minX: x,
                        maxX: x,
                        minY: y,
                        maxY: y,
                        pixels: []
                    };
                }
                
                components[label].pixels.push({ x, y });
                components[label].minX = Math.min(components[label].minX, x);
                components[label].maxX = Math.max(components[label].maxX, x);
                components[label].minY = Math.min(components[label].minY, y);
                components[label].maxY = Math.max(components[label].maxY, y);
            }
        }
        
        return Object.values(components)
            .map(comp => ({
                ...comp,
                x: comp.minX,
                y: comp.minY,
                width: comp.maxX - comp.minX + 1,
                height: comp.maxY - comp.minY + 1,
                area: comp.pixels.length,
                centerX: (comp.minX + comp.maxX) / 2,
                centerY: (comp.minY + comp.maxY) / 2
            }))
            .filter(comp => {
                return comp.area >= this.options.minArea && 
                       comp.area <= this.options.maxArea;
            })
            .sort((a, b) => b.area - a.area);
    }

    extractComponentImage(canvas, component) {
        const compCanvas = document.createElement('canvas');
        const padding = 5;
        const width = component.width + padding * 2;
        const height = component.height + padding * 2;
        
        compCanvas.width = width;
        compCanvas.height = height;
        
        const ctx = compCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(
            canvas,
            component.x,
            component.y,
            component.width,
            component.height,
            padding,
            padding,
            component.width,
            component.height
        );
        
        return compCanvas;
    }
}
