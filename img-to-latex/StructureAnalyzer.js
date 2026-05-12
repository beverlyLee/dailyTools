class StructureAnalyzer {
    constructor() {
        this.minComponentSize = 3;
        this.minComponentPixels = 5;
    }

    analyze(preprocessor, sourceCanvas) {
        const structureInfo = preprocessor.analyzeStructure(sourceCanvas);
        const { connectedComponents, width, height } = structureInfo;
        
        const components = connectedComponents.filter(
            c => c.width >= this.minComponentSize && 
                 c.height >= this.minComponentSize && 
                 c.pixelCount >= this.minComponentPixels
        );
        
        if (components.length === 0) {
            return {
                type: 'empty',
                components: [],
                symbols: [],
                structure: {}
            };
        }
        
        const structure = this.detectStructure(components, width, height, structureInfo);
        
        const groupedSymbols = this.groupSymbolsByStructure(components, structure, width, height);
        
        return {
            type: structure.type,
            components: components,
            groupedSymbols,
            structure,
            rawStructure: structureInfo,
            width,
            height
        };
    }

    detectStructure(components, width, height, structureInfo) {
        const { hasFractionBar, hasIntegralSign, hasSumSign, hasMatrixBrackets } = structureInfo;
        
        const baseline = this.estimateBaseline(components, height);
        
        const sortedByX = [...components].sort((a, b) => a.minX - b.minX);
        const sortedByY = [...components].sort((a, b) => a.minY - b.minY);
        
        let structureType = 'linear';
        let structureDetails = {};
        
        if (hasMatrixBrackets && components.length >= 4) {
            const matrixInfo = this.analyzeMatrixStructure(components, width, height);
            if (matrixInfo.rows >= 2 && matrixInfo.cols >= 2) {
                structureType = 'matrix';
                structureDetails = matrixInfo;
            }
        }
        
        if (structureType === 'linear' && hasFractionBar) {
            const fractionInfo = this.analyzeFractionStructure(components, width, height, structureInfo);
            if (fractionInfo.hasNumerator && fractionInfo.hasDenominator) {
                structureType = 'fraction';
                structureDetails = fractionInfo;
            }
        }
        
        if (structureType === 'linear' && hasIntegralSign) {
            const integralInfo = this.analyzeIntegralStructure(components, width, height);
            if (integralInfo.hasLower || integralInfo.hasUpper) {
                structureType = 'integral';
                structureDetails = integralInfo;
            }
        }
        
        if (structureType === 'linear' && hasSumSign) {
            const sumInfo = this.analyzeSumStructure(components, width, height);
            if (sumInfo.hasLower || sumInfo.hasUpper) {
                structureType = 'sum';
                structureDetails = sumInfo;
            }
        }
        
        const superscripts = [];
        const subscripts = [];
        
        for (const comp of components) {
            if (comp.centerY < baseline - height * 0.1) {
                if (comp.height < height * 0.3) {
                    superscripts.push(comp);
                }
            } else if (comp.centerY > baseline + height * 0.1) {
                if (comp.height < height * 0.3) {
                    subscripts.push(comp);
                }
            }
        }
        
        return {
            type: structureType,
            baseline,
            ...structureDetails,
            hasSuperscript: superscripts.length > 0,
            hasSubscript: subscripts.length > 0,
            superscriptCount: superscripts.length,
            subscriptCount: subscripts.length
        };
    }

    estimateBaseline(components, height) {
        const centerYs = components.map(c => c.centerY);
        centerYs.sort((a, b) => a - b);
        
        const median = centerYs[Math.floor(centerYs.length / 2)];
        
        const inlierRange = height * 0.2;
        let sum = 0;
        let count = 0;
        
        for (const y of centerYs) {
            if (Math.abs(y - median) < inlierRange) {
                sum += y;
                count++;
            }
        }
        
        return count > 0 ? sum / count : median;
    }

    analyzeFractionStructure(components, width, height, structureInfo) {
        const { horizontalProjection } = structureInfo;
        
        let fractionBarY = -1;
        let maxLength = 0;
        
        for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
            let consecutive = 0;
            let maxConsecutive = 0;
            
            for (let x = 0; x < width; x++) {
                if (horizontalProjection && horizontalProjection[y] > 0) {
                    consecutive++;
                    maxConsecutive = Math.max(maxConsecutive, consecutive);
                } else {
                    consecutive = 0;
                }
            }
            
            if (maxConsecutive > maxLength && maxConsecutive > width * 0.2) {
                maxLength = maxConsecutive;
                fractionBarY = y;
            }
        }
        
        const numerator = components.filter(c => c.maxY < fractionBarY - 5);
        const denominator = components.filter(c => c.minY > fractionBarY + 5);
        
        return {
            fractionBarY,
            barLength: maxLength,
            numeratorComponents: numerator,
            denominatorComponents: denominator,
            hasNumerator: numerator.length > 0,
            hasDenominator: denominator.length > 0
        };
    }

    analyzeMatrixStructure(components, width, height) {
        const rows = this.detectRows(components, height);
        const cols = this.detectColumns(components, width);
        
        return {
            rows: rows.length,
            cols: cols.length,
            rowPositions: rows,
            colPositions: cols
        };
    }

    detectRows(components, height) {
        const centerYs = components.map(c => c.centerY);
        centerYs.sort((a, b) => a - b);
        
        const rows = [];
        const threshold = height * 0.15;
        
        let currentRow = [centerYs[0]];
        
        for (let i = 1; i < centerYs.length; i++) {
            if (centerYs[i] - centerYs[i - 1] < threshold) {
                currentRow.push(centerYs[i]);
            } else {
                rows.push(currentRow.reduce((a, b) => a + b, 0) / currentRow.length);
                currentRow = [centerYs[i]];
            }
        }
        
        if (currentRow.length > 0) {
            rows.push(currentRow.reduce((a, b) => a + b, 0) / currentRow.length);
        }
        
        return rows;
    }

    detectColumns(components, width) {
        const centerXs = components.map(c => c.centerX);
        centerXs.sort((a, b) => a - b);
        
        const cols = [];
        const threshold = width * 0.1;
        
        let currentCol = [centerXs[0]];
        
        for (let i = 1; i < centerXs.length; i++) {
            if (centerXs[i] - centerXs[i - 1] < threshold) {
                currentCol.push(centerXs[i]);
            } else {
                cols.push(currentCol.reduce((a, b) => a + b, 0) / currentCol.length);
                currentCol = [centerXs[i]];
            }
        }
        
        if (currentCol.length > 0) {
            cols.push(currentCol.reduce((a, b) => a + b, 0) / currentCol.length);
        }
        
        return cols;
    }

    analyzeIntegralStructure(components, width, height) {
        const leftComponents = components.filter(c => c.centerX < width * 0.3);
        const rightComponents = components.filter(c => c.centerX > width * 0.3);
        
        const topRight = rightComponents.filter(c => c.centerY < height * 0.35);
        const bottomRight = rightComponents.filter(c => c.centerY > height * 0.65);
        
        return {
            integralPosition: leftComponents.length > 0 ? 'left' : 'none',
            upperLimitComponents: topRight,
            lowerLimitComponents: bottomRight,
            hasUpper: topRight.length > 0,
            hasLower: bottomRight.length > 0
        };
    }

    analyzeSumStructure(components, width, height) {
        const centerComponent = components.find(c => 
            c.centerX > width * 0.25 && 
            c.centerX < width * 0.75
        );
        
        const aboveComponents = components.filter(c => 
            c.maxY < height * 0.35
        );
        
        const belowComponents = components.filter(c => 
            c.minY > height * 0.65
        );
        
        return {
            upperLimitComponents: aboveComponents,
            lowerLimitComponents: belowComponents,
            hasUpper: aboveComponents.length > 0,
            hasLower: belowComponents.length > 0
        };
    }

    groupSymbolsByStructure(components, structure, width, height) {
        const groups = [];
        const sorted = [...components].sort((a, b) => a.minX - b.minX);
        
        if (structure.type === 'fraction' && structure.fractionBarY > 0) {
            const numerator = sorted.filter(c => c.maxY < structure.fractionBarY - 5);
            const denominator = sorted.filter(c => c.minY > structure.fractionBarY + 5);
            
            if (numerator.length > 0) {
                groups.push({
                    type: 'numerator',
                    components: numerator,
                    position: 'above'
                });
            }
            
            if (denominator.length > 0) {
                groups.push({
                    type: 'denominator',
                    components: denominator,
                    position: 'below'
                });
            }
        } else if (structure.type === 'matrix') {
            const { rowPositions, colPositions } = structure;
            
            for (let rowIdx = 0; rowIdx < rowPositions.length; rowIdx++) {
                const row = [];
                
                for (let colIdx = 0; colIdx < colPositions.length; colIdx++) {
                    const cellComponents = sorted.filter(c => {
                        const inRow = Math.abs(c.centerY - rowPositions[rowIdx]) < height * 0.1;
                        const inCol = colIdx === 0 || 
                            Math.abs(c.centerX - colPositions[colIdx]) < width * 0.1;
                        return inRow && inCol;
                    });
                    
                    if (cellComponents.length > 0) {
                        row.push({
                            row: rowIdx,
                            col: colIdx,
                            components: cellComponents
                        });
                    }
                }
                
                if (row.length > 0) {
                    groups.push({
                        type: 'matrix_row',
                        rowIndex: rowIdx,
                        cells: row
                    });
                }
            }
        } else if (structure.type === 'integral' || structure.type === 'sum') {
            const main = sorted.filter(c => {
                return c.centerY > height * 0.3 && c.centerY < height * 0.7;
            });
            
            const upper = sorted.filter(c => c.maxY < height * 0.35);
            const lower = sorted.filter(c => c.minY > height * 0.65);
            
            if (upper.length > 0) {
                groups.push({
                    type: 'upper_limit',
                    components: upper,
                    position: 'superscript'
                });
            }
            
            if (main.length > 0) {
                groups.push({
                    type: 'main',
                    components: main,
                    position: 'normal'
                });
            }
            
            if (lower.length > 0) {
                groups.push({
                    type: 'lower_limit',
                    components: lower,
                    position: 'subscript'
                });
            }
        } else {
            const baseline = structure.baseline;
            const baselineTolerance = height * 0.15;
            
            const normal = [];
            const superscript = [];
            const subscript = [];
            
            for (const comp of sorted) {
                if (comp.centerY < baseline - baselineTolerance && 
                    comp.height < height * 0.35) {
                    superscript.push(comp);
                } else if (comp.centerY > baseline + baselineTolerance && 
                           comp.height < height * 0.35) {
                    subscript.push(comp);
                } else {
                    normal.push(comp);
                }
            }
            
            if (superscript.length > 0) {
                groups.push({
                    type: 'superscript',
                    components: superscript,
                    position: 'above'
                });
            }
            
            if (normal.length > 0) {
                groups.push({
                    type: 'normal',
                    components: normal,
                    position: 'baseline'
                });
            }
            
            if (subscript.length > 0) {
                groups.push({
                    type: 'subscript',
                    components: subscript,
                    position: 'below'
                });
            }
        }
        
        return groups;
    }

    detectSuperscriptSubscriptPairs(components, width, height) {
        const pairs = [];
        const baseline = this.estimateBaseline(components, height);
        
        const baselineComponents = components.filter(c => 
            Math.abs(c.centerY - baseline) < height * 0.2
        );
        
        baselineComponents.sort((a, b) => a.centerX - b.centerX);
        
        for (let i = 0; i < baselineComponents.length - 1; i++) {
            const base = baselineComponents[i];
            const next = baselineComponents[i + 1];
            
            const gap = next.minX - base.maxX;
            
            const aboveComponents = components.filter(c => 
                c.centerX > base.centerX && 
                c.centerX < next.centerX &&
                c.maxY < base.centerY - height * 0.05
            );
            
            const belowComponents = components.filter(c => 
                c.centerX > base.centerX && 
                c.centerX < next.centerX &&
                c.minY > base.centerY + height * 0.05
            );
            
            if (aboveComponents.length > 0 || belowComponents.length > 0) {
                pairs.push({
                    base,
                    superscripts: aboveComponents,
                    subscripts: belowComponents,
                    gap
                });
            }
        }
        
        return pairs;
    }
}

export { StructureAnalyzer };
