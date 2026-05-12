export class NoiseRemover {
    constructor(options = {}) {
        this.minPixelArea = options.minPixelArea || 5;
    }

    setMinPixelArea(area) {
        this.minPixelArea = area;
    }

    apply(imageData) {
        const { width, height, data } = imageData;
        const binaryData = this.extractBinaryImage(data, width, height);
        const labels = this.connectedComponents(binaryData, width, height);
        const result = this.removeSmallComponents(labels, width, height);
        
        return { imageData: { width, height, data: result } };
    }

    extractBinaryImage(data, width, height) {
        const binary = new Uint8Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            binary[i] = data[idx] > 127 ? 0 : 1;
        }
        
        return binary;
    }

    connectedComponents(binary, width, height) {
        const labels = new Int32Array(width * height);
        const parent = [];
        let nextLabel = 1;
        
        const find = (label) => {
            while (parent[label] !== label) {
                label = parent[label];
            }
            return label;
        };
        
        const union = (label1, label2) => {
            const root1 = find(label1);
            const root2 = find(label2);
            if (root1 !== root2) {
                parent[root2] = root1;
            }
        };
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (binary[idx] === 0) {
                    labels[idx] = 0;
                    continue;
                }
                
                const neighborLabels = [];
                
                if (x > 0 && labels[idx - 1] > 0) {
                    neighborLabels.push(labels[idx - 1]);
                }
                if (y > 0 && labels[idx - width] > 0) {
                    neighborLabels.push(labels[idx - width]);
                }
                
                if (neighborLabels.length === 0) {
                    labels[idx] = nextLabel;
                    parent[nextLabel] = nextLabel;
                    nextLabel++;
                } else {
                    const minLabel = Math.min(...neighborLabels);
                    labels[idx] = minLabel;
                    
                    for (const label of neighborLabels) {
                        if (label !== minLabel) {
                            union(minLabel, label);
                        }
                    }
                }
            }
        }
        
        const labelMap = {};
        let currentLabel = 1;
        
        for (let i = 1; i < nextLabel; i++) {
            const root = find(i);
            if (!(root in labelMap)) {
                labelMap[root] = currentLabel++;
            }
            labelMap[i] = labelMap[root];
        }
        
        for (let i = 0; i < labels.length; i++) {
            if (labels[i] > 0) {
                labels[i] = labelMap[labels[i]];
            }
        }
        
        return labels;
    }

    removeSmallComponents(labels, width, height) {
        const componentSizes = {};
        
        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            if (label > 0) {
                componentSizes[label] = (componentSizes[label] || 0) + 1;
            }
        }
        
        const result = new Uint8ClampedArray(width * height * 4);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const label = labels[idx];
                const isForeground = label > 0 && (componentSizes[label] || 0) >= this.minPixelArea;
                const value = isForeground ? 0 : 255;
                
                const outIdx = idx * 4;
                result[outIdx] = value;
                result[outIdx + 1] = value;
                result[outIdx + 2] = value;
                result[outIdx + 3] = 255;
            }
        }
        
        return result;
    }
}
