class LineDetector {
    constructor(options = {}) {
        this.options = {
            minLineLengthRatio: options.minLineLengthRatio || 0.2,
            maxLineGap: options.maxLineGap || 20
        };
    }

    detect(imageData, preprocessedData = null) {
        console.log('[LineDetector] 开始检测五线谱...');
        
        const binaryData = preprocessedData ? preprocessedData.binary : this.simpleBinarize(imageData);
        const width = imageData.width;
        const height = imageData.height;
        
        const horizontalProjection = this.calculateHorizontalProjection(binaryData, width, height);
        const lineCandidates = this.findLineCandidates(horizontalProjection, height);
        
        let staves = this.groupIntoStaves(lineCandidates, width, height, binaryData);
        
        if (staves.length === 0) {
            console.log(`[LineDetector] 候选线条不足，创建虚拟谱表`);
            staves = this.createVirtualStaff(height, width);
        }
        
        const barLines = this.detectBarLines(binaryData, width, height, staves);
        const timeSignature = this.detectTimeSignature(binaryData, width, height, staves);
        
        console.log(`[LineDetector] 检测到 ${staves.length} 个谱表, ${barLines.length} 个小节线`);
        
        return {
            staves: staves,
            barLines: barLines,
            timeSignature: timeSignature,
            binaryData: binaryData,
            horizontalProjection: horizontalProjection
        };
    }

    simpleBinarize(imageData) {
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

    calculateHorizontalProjection(binaryData, width, height) {
        const projection = new Array(height).fill(0);
        
        for (let y = 0; y < height; y++) {
            let darkPixels = 0;
            for (let x = 0; x < width; x++) {
                if (binaryData[y * width + x] === 0) {
                    darkPixels++;
                }
            }
            projection[y] = darkPixels / width;
        }
        
        return projection;
    }

    calculateVerticalProjection(binaryData, width, height, topY, bottomY) {
        const projection = new Array(width).fill(0);
        
        for (let x = 0; x < width; x++) {
            let darkPixels = 0;
            for (let y = topY; y < bottomY; y++) {
                if (binaryData[y * width + x] === 0) {
                    darkPixels++;
                }
            }
            projection[x] = darkPixels / (bottomY - topY);
        }
        
        return projection;
    }

    findLineCandidates(projection, height) {
        const candidates = [];
        
        const maxVal = Math.max(...projection);
        const threshold = maxVal * 0.25;
        
        let i = 0;
        while (i < height) {
            if (projection[i] > threshold) {
                let start = i;
                while (i < height && projection[i] > threshold * 0.5) {
                    i++;
                }
                let end = i - 1;
                
                const center = Math.round((start + end) / 2);
                const strength = projection[center];
                
                candidates.push({
                    y: center,
                    startY: start,
                    endY: end,
                    strength: strength,
                    thickness: end - start + 1
                });
            }
            i++;
        }
        
        return candidates;
    }

    groupIntoStaves(candidates, width, height, binaryData) {
        if (candidates.length < 5) {
            return [];
        }
        
        candidates.sort((a, b) => a.y - b.y);
        
        const spacings = [];
        for (let i = 1; i < candidates.length; i++) {
            spacings.push(candidates[i].y - candidates[i - 1].y);
        }
        
        const avgSpacing = this.calculateTypicalSpacing(spacings);
        console.log(`[LineDetector] 五线谱典型间距: ${avgSpacing}px`);
        
        const staves = [];
        const used = new Set();
        
        for (let startIdx = 0; startIdx <= candidates.length - 5; startIdx++) {
            if (used.has(startIdx)) continue;
            
            const group = candidates.slice(startIdx, startIdx + 5);
            
            if (this.isValidStaffGroup(group, avgSpacing)) {
                const lines = group.map(c => c.y);
                const lineSpacing = (lines[4] - lines[0]) / 4;
                
                const staff = {
                    lines: lines,
                    topY: group[0].startY,
                    bottomY: group[4].endY,
                    height: group[4].endY - group[0].startY,
                    lineSpacing: lineSpacing,
                    clef: 'treble',
                    index: staves.length
                };
                
                if (this.verifyStaff(staff, width, binaryData)) {
                    staves.push(staff);
                    for (let i = 0; i < 5; i++) {
                        used.add(startIdx + i);
                    }
                }
            }
        }
        
        return staves;
    }

    calculateTypicalSpacing(spacings) {
        if (spacings.length === 0) return 20;
        
        spacings.sort((a, b) => a - b);
        
        const validSpacings = spacings.filter(s => s >= 8 && s <= 100);
        
        if (validSpacings.length === 0) return 20;
        
        return validSpacings[Math.floor(validSpacings.length / 2)];
    }

    isValidStaffGroup(group, avgSpacing) {
        const expectedSpacing = avgSpacing || 20;
        const tolerance = expectedSpacing * 0.6;
        
        for (let i = 1; i < group.length; i++) {
            const spacing = group[i].y - group[i - 1].y;
            if (Math.abs(spacing - expectedSpacing) > tolerance) {
                return false;
            }
        }
        
        return true;
    }

    verifyStaff(staff, width, binaryData) {
        const lines = staff.lines;
        
        let validLines = 0;
        for (const lineY of lines) {
            if (this.isHorizontalLine(lineY, width, binaryData)) {
                validLines++;
            }
        }
        
        return validLines >= 3;
    }

    isHorizontalLine(y, width, binaryData) {
        let darkCount = 0;
        const checkWidth = Math.floor(width * 0.4);
        const startX = Math.floor(width * 0.3);
        
        for (let x = startX; x < startX + checkWidth && x < width; x++) {
            if (binaryData[y * width + x] === 0) {
                darkCount++;
            }
        }
        
        return darkCount / checkWidth > 0.3;
    }

    detectBarLines(binaryData, width, height, staves) {
        const barLines = [];
        
        if (staves.length === 0) return barLines;
        
        for (const staff of staves) {
            const topY = Math.max(0, staff.topY - staff.lineSpacing);
            const bottomY = Math.min(height, staff.bottomY + staff.lineSpacing);
            const staffHeight = bottomY - topY;
            
            const verticalProjection = this.calculateVerticalProjection(
                binaryData, width, height, topY, bottomY
            );
            
            const threshold = 0.6;
            
            let i = 0;
            while (i < width) {
                if (verticalProjection[i] > threshold) {
                    let start = i;
                    while (i < width && verticalProjection[i] > threshold * 0.5) {
                        i++;
                    }
                    let end = i - 1;
                    
                    const lineWidth = end - start + 1;
                    const centerX = Math.round((start + end) / 2);
                    
                    if (lineWidth >= 2 && lineWidth <= Math.max(8, staff.lineSpacing * 0.4)) {
                        let lineScore = 0;
                        const checkHeight = Math.floor(staffHeight * 0.6);
                        const startCheckY = Math.floor(staffHeight * 0.2);
                        
                        for (let y = 0; y < checkHeight; y++) {
                            const yPos = topY + startCheckY + y;
                            if (binaryData[yPos * width + centerX] === 0) {
                                lineScore++;
                            }
                        }
                        
                        if (lineScore / checkHeight > 0.5) {
                            barLines.push({
                                x: centerX,
                                startX: start,
                                endX: end,
                                staffIndex: staff.index,
                                width: lineWidth
                            });
                        }
                    }
                }
                i++;
            }
        }
        
        barLines.sort((a, b) => a.x - b.x);
        
        return barLines;
    }

    detectTimeSignature(binaryData, width, height, staves) {
        if (staves.length === 0) return null;
        
        const staff = staves[0];
        const lineSpacing = staff.lineSpacing;
        const searchWidth = Math.min(width * 0.2, 200);
        
        for (let x = 5; x < searchWidth; x += 2) {
            let verticalDark = 0;
            const checkRange = staff.lines[4] - staff.lines[0];
            const startY = staff.lines[0];
            const endY = staff.lines[4];
            
            for (let y = startY; y <= endY; y++) {
                if (binaryData[y * width + x] === 0) {
                    verticalDark++;
                }
            }
            
            const verticalRatio = verticalDark / checkRange;
            
            if (verticalRatio > 0.6) {
                const gap = Math.floor(lineSpacing * 0.8);
                
                let hasUpperNumber = false;
                let hasLowerNumber = false;
                
                const checkY1 = staff.lines[1] + Math.floor(lineSpacing * 0.3);
                const checkY2 = staff.lines[3] + Math.floor(lineSpacing * 0.3);
                
                for (let checkX = x + gap; checkX < x + gap + 20 && checkX < searchWidth; checkX++) {
                    if (binaryData[checkY1 * width + checkX] === 0) {
                        hasUpperNumber = true;
                    }
                    if (binaryData[checkY2 * width + checkX] === 0) {
                        hasLowerNumber = true;
                    }
                }
                
                if (hasUpperNumber || hasLowerNumber) {
                    return {
                        type: 'detected',
                        x: x,
                        hasUpper: hasUpperNumber,
                        hasLower: hasLowerNumber
                    };
                }
            }
        }
        
        return null;
    }

    createVirtualStaff(height, width) {
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
}

export { LineDetector };
