class NoteHeadLocator {
    constructor(options = {}) {
        this.options = {
            minNoteSize: options.minNoteSize || 5,
            maxNoteSize: options.maxNoteSize || 60,
            minAspectRatio: options.minAspectRatio || 0.4,
            maxAspectRatio: options.maxAspectRatio || 2.5
        };
    }

    locate(imageData, staves, preprocessedData) {
        console.log('[NoteHeadLocator] 几何检测符头...');
        
        const binaryData = preprocessedData ? preprocessedData.binary : this.extractBinary(imageData);
        const width = imageData.width;
        const height = imageData.height;
        
        if (staves.length === 0) {
            console.log('[NoteHeadLocator] 未检测到谱表，创建虚拟谱表');
            staves = this.estimateStaves(height, width, binaryData);
        }
        
        const noteHeads = [];
        const visited = new Set();
        
        for (let staffIndex = 0; staffIndex < staves.length; staffIndex++) {
            const staff = staves[staffIndex];
            const lineSpacing = staff.lineSpacing || 15;
            
            const searchTop = Math.max(0, staff.topY - lineSpacing * 3);
            const searchBottom = Math.min(height, staff.bottomY + lineSpacing * 3);
            
            const minSize = Math.max(this.options.minNoteSize, lineSpacing * 0.35);
            const maxSize = Math.min(this.options.maxNoteSize, lineSpacing * 2.5);
            
            console.log(`[NoteHeadLocator] 谱表 ${staffIndex}: 搜索范围 [${searchTop}, ${searchBottom}], 符头大小范围 [${minSize.toFixed(1)}, ${maxSize.toFixed(1)}]`);
            
            const staffNotes = this.findNoteHeadsInRegion(
                binaryData, 
                width, 
                height, 
                searchTop, 
                searchBottom,
                minSize,
                maxSize,
                staffIndex,
                visited
            );
            
            noteHeads.push(...staffNotes);
        }
        
        if (noteHeads.length === 0) {
            console.log('[NoteHeadLocator] 谱表区域未找到符头，全图搜索...');
            const fallbackNotes = this.fullImageSearch(binaryData, width, height, visited);
            noteHeads.push(...fallbackNotes);
        }
        
        const uniqueNotes = this.removeDuplicates(noteHeads);
        
        console.log(`[NoteHeadLocator] 检测到 ${uniqueNotes.length} 个符头`);
        
        return uniqueNotes;
    }

    extractBinary(imageData) {
        const grayscale = new Uint8ClampedArray(imageData.width * imageData.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            grayscale[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        let sum = 0;
        for (let i = 0; i < grayscale.length; i++) {
            sum += grayscale[i];
        }
        const threshold = sum / grayscale.length * 0.7;
        
        const binary = new Uint8ClampedArray(imageData.width * imageData.height);
        for (let i = 0; i < grayscale.length; i++) {
            binary[i] = grayscale[i] < threshold ? 0 : 255;
        }
        
        return binary;
    }

    estimateStaves(height, width, binaryData) {
        const centerY = height * 0.5;
        const lineSpacing = Math.max(12, height * 0.04);
        
        return [{
            lines: [
                centerY - lineSpacing * 2,
                centerY - lineSpacing,
                centerY,
                centerY + lineSpacing,
                centerY + lineSpacing * 2
            ],
            topY: centerY - lineSpacing * 2.5,
            bottomY: centerY + lineSpacing * 2.5,
            height: lineSpacing * 5,
            lineSpacing: lineSpacing,
            clef: 'treble',
            index: 0
        }];
    }

    findNoteHeadsInRegion(binaryData, width, height, top, bottom, minSize, maxSize, staffIndex, visited) {
        const notes = [];
        
        for (let y = top; y < bottom; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (binaryData[idx] === 0 && !visited.has(idx)) {
                    const blob = this.floodFill(binaryData, width, height, x, y, visited);
                    
                    if (blob && blob.pixelCount >= 3) {
                        const isValid = this.validateNoteHeadGeometry(blob, minSize, maxSize);
                        
                        if (isValid) {
                            notes.push({
                                x: blob.centerX,
                                y: blob.centerY,
                                width: blob.width,
                                height: blob.height,
                                filled: this.isFilled(blob, binaryData, width),
                                staffIndex: staffIndex,
                                boundingBox: {
                                    minX: blob.minX,
                                    maxX: blob.maxX,
                                    minY: blob.minY,
                                    maxY: blob.maxY
                                }
                            });
                        }
                    }
                }
            }
        }
        
        return notes;
    }

    floodFill(binaryData, width, height, startX, startY, visited) {
        const stack = [{x: startX, y: startY}];
        const pixels = [];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        
        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited.has(idx)) continue;
            if (binaryData[idx] !== 0) continue;
            
            visited.add(idx);
            pixels.push({x, y});
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            stack.push({x: x + 1, y});
            stack.push({x: x - 1, y});
            stack.push({x, y: y + 1});
            stack.push({x, y: y - 1});
            
            stack.push({x: x + 1, y: y + 1});
            stack.push({x: x - 1, y: y + 1});
            stack.push({x: x + 1, y: y - 1});
            stack.push({x: x - 1, y: y - 1});
        }
        
        if (pixels.length === 0) return null;
        
        return {
            pixels: pixels,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            minX, maxX, minY, maxY,
            pixelCount: pixels.length
        };
    }

    validateNoteHeadGeometry(blob, minSize, maxSize) {
        const {width: w, height: h, pixelCount} = blob;
        const avgSize = (w + h) / 2;
        
        if (avgSize < minSize) return false;
        if (avgSize > maxSize) return false;
        
        const aspectRatio = Math.min(w, h) / Math.max(w, h);
        if (aspectRatio < this.options.minAspectRatio) return false;
        if (aspectRatio > this.options.maxAspectRatio) return false;
        
        const area = w * h;
        const fillRatio = pixelCount / area;
        
        if (fillRatio < 0.15) return false;
        if (fillRatio > 1.0) return false;
        
        return true;
    }

    isFilled(blob, binaryData, width) {
        const centerX = Math.round(blob.centerX);
        const centerY = Math.round(blob.centerY);
        const checkRadius = Math.min(blob.width, blob.height) / 5;
        
        let filledPixels = 0;
        let totalPixels = 0;
        
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (dx * dx + dy * dy <= checkRadius * checkRadius) {
                    totalPixels++;
                    if (x >= 0 && x < width && y >= 0 && y < (binaryData.length / width)) {
                        if (binaryData[y * width + x] === 0) {
                            filledPixels++;
                        }
                    }
                }
            }
        }
        
        return totalPixels > 0 && filledPixels / totalPixels > 0.4;
    }

    fullImageSearch(binaryData, width, height, visited) {
        const notes = [];
        const minSize = this.options.minNoteSize;
        const maxSize = this.options.maxNoteSize;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (binaryData[idx] === 0 && !visited.has(idx)) {
                    const blob = this.floodFill(binaryData, width, height, x, y, visited);
                    
                    if (blob && blob.pixelCount >= 3) {
                        const isValid = this.validateNoteHeadGeometry(blob, minSize, maxSize);
                        
                        if (isValid) {
                            notes.push({
                                x: blob.centerX,
                                y: blob.centerY,
                                width: blob.width,
                                height: blob.height,
                                filled: this.isFilled(blob, binaryData, width),
                                staffIndex: 0,
                                boundingBox: {
                                    minX: blob.minX,
                                    maxX: blob.maxX,
                                    minY: blob.minY,
                                    maxY: blob.maxY
                                }
                            });
                        }
                    }
                }
            }
        }
        
        return notes;
    }

    removeDuplicates(notes) {
        if (notes.length === 0) return [];
        
        notes.sort((a, b) => {
            const sizeA = (a.width + a.height) / 2;
            const sizeB = (b.width + b.height) / 2;
            return sizeB - sizeA;
        });
        
        const unique = [];
        const used = new Set();
        
        for (let i = 0; i < notes.length; i++) {
            if (used.has(i)) continue;
            
            const note = notes[i];
            unique.push(note);
            
            for (let j = i + 1; j < notes.length; j++) {
                if (used.has(j)) continue;
                
                const other = notes[j];
                const dx = other.x - note.x;
                const dy = other.y - note.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const avgSize = ((Math.max(note.width, note.height) + Math.max(other.width, other.height)) / 2) * 0.7;
                
                if (distance < avgSize) {
                    used.add(j);
                }
            }
        }
        
        unique.sort((a, b) => a.x - b.x);
        
        return unique;
    }
}

export { NoteHeadLocator };
