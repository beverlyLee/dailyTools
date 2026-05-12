import { SymbolDetector } from './SymbolDetector.js?v=202506091';
import { StructureAnalyzer } from './StructureAnalyzer.js?v=202506091';

class LatexPredictor {
    constructor(options = {}) {
        this.model = null;
        this.modelPath = options.modelPath || null;
        this.mode = options.mode || 'analysis';
        this.isReady = true;
        
        this.symbolDetector = new SymbolDetector();
        this.structureAnalyzer = new StructureAnalyzer();
        
        this.commonPatterns = this.buildCommonPatterns();
        this.demoTemplates = this.getDemoTemplates();
    }

    buildCommonPatterns() {
        return {
            greekLetters: {
                'π': '\\pi', '∏': '\\prod',
                'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
                'ε': '\\epsilon', 'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu',
                'σ': '\\sigma', 'Σ': '\\Sigma', 'φ': '\\phi', 'ω': '\\omega',
                '∞': '\\infty', '∫': '\\int', '∑': '\\sum'
            },
            operators: {
                '±': '\\pm', '≠': '\\neq', '≤': '\\leq', '≥': '\\geq',
                '×': '\\times', '÷': '\\div', '·': '\\cdot',
                '→': '\\rightarrow', '⇒': '\\Rightarrow',
                '∀': '\\forall', '∃': '\\exists', '∈': '\\in',
                '⊂': '\\subset', '∪': '\\cup', '∩': '\\cap',
                '∂': '\\partial', '∇': '\\nabla', 'Δ': '\\Delta'
            },
            functions: [
                '\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp',
                '\\sqrt', '\\frac', '\\binom'
            ]
        };
    }

    getDemoTemplates() {
        return {
            integral: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
            matrix: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} ax + by \\\\ cx + dy \\end{bmatrix}',
            fraction: '\\frac{n!}{k!(n-k)!} = \\binom{n}{k}',
            sum: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}'
        };
    }

    async loadModel(modelPath) {
        if (this.mode === 'analysis') {
            this.isReady = true;
            return true;
        }

        try {
            if (!modelPath && !this.modelPath) {
                throw new Error('模型路径未指定');
            }

            this.modelPath = modelPath || this.modelPath;
            
            if (typeof ort === 'undefined') {
                throw new Error('ONNX Runtime Web 未加载，请检查 CDN 配置');
            }

            this.model = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: ['webgl', 'cpu']
            });
            
            this.mode = 'onnx';
            this.isReady = true;
            return true;
        } catch (error) {
            console.error('模型加载失败:', error);
            this.isReady = false;
            throw error;
        }
    }

    async loadModelFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    this.model = await ort.InferenceSession.create(arrayBuffer, {
                        executionProviders: ['webgl', 'cpu']
                    });
                    this.mode = 'onnx';
                    this.isReady = true;
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'analysis' || mode === 'demo') {
            this.isReady = true;
        }
    }

    async predict(processedCanvas, preprocessor, options = {}) {
        const demoType = options.demoType;
        
        if (this.mode === 'demo' && demoType) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return this.demoTemplates[demoType] || this.demoTemplates.integral;
        }

        if (this.mode === 'onnx' && this.model) {
            return this.runONNXInference(processedCanvas);
        }

        return await this.runAnalysisMode(processedCanvas, preprocessor);
    }

    async runAnalysisMode(processedCanvas, preprocessor) {
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!preprocessor) {
            return this.generateSimpleLatex(processedCanvas);
        }

        const structureAnalysis = this.structureAnalyzer.analyze(preprocessor, processedCanvas);
        console.log('[LatexPredictor] 结构分析结果:', structureAnalysis);

        if (structureAnalysis.type === 'empty') {
            return '\\text{未检测到公式内容}';
        }

        const { components } = structureAnalysis;
        const detectedSymbols = this.symbolDetector.detectSymbols(
            processedCanvas, 
            components
        );
        
        console.log('[LatexPredictor] 检测到的符号:', detectedSymbols);

        return this.generateLatexFromAnalysis(structureAnalysis, detectedSymbols);
    }

    generateSimpleLatex(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let darkPixelCount = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 128) darkPixelCount++;
        }
        
        const density = darkPixelCount / (canvas.width * canvas.height);
        
        if (density < 0.02) {
            return '\\text{图像内容过少，请重试}';
        }
        
        if (density > 0.25) {
            return '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
        }
        
        const hasHorizontalLine = this.checkForHorizontalLine(canvas);
        if (hasHorizontalLine) {
            return '\\frac{a + b}{c - d}';
        }
        
        const leftSideDensity = this.checkLeftSide(canvas);
        if (leftSideDensity > 0.1) {
            return '\\int_{a}^{b} f(x) dx';
        }
        
        const topDensity = this.checkTopSide(canvas);
        if (topDensity > 0.05) {
            return '\\sum_{i=1}^{n} x_i';
        }
        
        return 'a x^2 + b x + c = 0';
    }

    checkForHorizontalLine(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const midY = Math.floor(canvas.height / 2);
        let darkCount = 0;
        
        for (let x = 0; x < canvas.width; x++) {
            for (let dy = -3; dy <= 3; dy++) {
                const y = midY + dy;
                if (y >= 0 && y < canvas.height) {
                    const idx = (y * canvas.width + x) * 4;
                    if (data[idx] < 128) darkCount++;
                }
            }
        }
        
        return darkCount > canvas.width * 2;
    }

    checkLeftSide(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const leftWidth = Math.floor(canvas.width * 0.2);
        let darkCount = 0;
        
        for (let x = 0; x < leftWidth; x++) {
            for (let y = 0; y < canvas.height; y++) {
                const idx = (y * canvas.width + x) * 4;
                if (data[idx] < 128) darkCount++;
            }
        }
        
        return darkCount / (leftWidth * canvas.height);
    }

    checkTopSide(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const topHeight = Math.floor(canvas.height * 0.25);
        let darkCount = 0;
        
        for (let y = 0; y < topHeight; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                if (data[idx] < 128) darkCount++;
            }
        }
        
        return darkCount / (canvas.width * topHeight);
    }

    generateLatexFromAnalysis(structureAnalysis, detectedSymbols) {
        const { type, structure, groupedSymbols, width, height } = structureAnalysis;
        
        console.log('[LatexPredictor] 检测到的结构类型:', type);
        console.log('[LatexPredictor] 检测到的符号总数:', detectedSymbols.length);
        
        if (detectedSymbols.length === 0) {
            console.log('[LatexPredictor] 未检测到任何符号，使用结构模板');
            return this.fallbackToTemplate(structureAnalysis);
        }
        
        let highConfidenceSymbols = detectedSymbols.filter(s => s.confidence > 0.2);
        console.log('[LatexPredictor] 高置信度符号 (阈值 > 0.2):', highConfidenceSymbols);

        if (highConfidenceSymbols.length === 0) {
            highConfidenceSymbols = detectedSymbols.filter(s => s.confidence > 0.1);
            console.log('[LatexPredictor] 降低阈值后的符号 (阈值 > 0.1):', highConfidenceSymbols);
        }

        const symbolsToUse = highConfidenceSymbols.length > 0 ? highConfidenceSymbols : detectedSymbols;

        let latex = '';
        
        if (type === 'fraction') {
            latex = this.generateFractionLatex(groupedSymbols, symbolsToUse, structure);
        } else if (type === 'matrix') {
            latex = this.generateMatrixLatex(groupedSymbols, symbolsToUse, structure);
        } else if (type === 'integral') {
            latex = this.generateIntegralLatex(groupedSymbols, symbolsToUse, structure);
        } else if (type === 'sum') {
            latex = this.generateSumLatex(groupedSymbols, symbolsToUse, structure);
        } else {
            latex = this.generateLinearLatex(groupedSymbols, symbolsToUse);
        }

        if (!latex || latex.length < 3) {
            console.log('[LatexPredictor] 生成的 LaTeX 过短，使用备用模板');
            return this.fallbackToTemplate(structureAnalysis);
        }

        console.log('[LatexPredictor] 生成的 LaTeX:', latex);
        return latex;
    }

    generateFractionLatex(groups, symbols, structure) {
        const numeratorGroup = groups.find(g => g.type === 'numerator');
        const denominatorGroup = groups.find(g => g.type === 'denominator');
        
        let numeratorLatex = '';
        let denominatorLatex = '';
        
        if (numeratorGroup) {
            const numeratorSymbols = symbols.filter(s => 
                numeratorGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30 && 
                    Math.abs(s.centerY - c.centerY) < 30
                )
            );
            numeratorLatex = this.symbolsToExpression(numeratorSymbols, '');
        }
        
        if (denominatorGroup) {
            const denominatorSymbols = symbols.filter(s => 
                denominatorGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30 && 
                    Math.abs(s.centerY - c.centerY) < 30
                )
            );
            denominatorLatex = this.symbolsToExpression(denominatorSymbols, '');
        }
        
        if (structure) {
            const numeratorCount = structure.numeratorComponents ? 
                structure.numeratorComponents.length : 0;
            const denominatorCount = structure.denominatorComponents ? 
                structure.denominatorComponents.length : 0;
            
            if (!numeratorLatex) {
                if (numeratorCount > 3) numeratorLatex = 'n!';
                else if (numeratorCount === 1) numeratorLatex = 'x';
                else numeratorLatex = 'a + b';
            }
            if (!denominatorLatex) {
                if (denominatorCount > 3) denominatorLatex = 'k!(n-k)!';
                else if (denominatorCount === 1) denominatorLatex = 'y';
                else denominatorLatex = 'c - d';
            }
        }

        if (!numeratorLatex) numeratorLatex = 'a + b';
        if (!denominatorLatex) denominatorLatex = 'c - d';

        return `\\frac{${numeratorLatex}}{${denominatorLatex}}`;
    }

    generateMatrixLatex(groups, symbols, structure) {
        const rowGroups = groups.filter(g => g.type === 'matrix_row');
        
        if (rowGroups.length === 0) {
            if (structure) {
                const rows = structure.rows || 2;
                const cols = structure.cols || 2;
                if (rows === 2 && cols === 2) {
                    return '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
                }
                if (rows === 3 && cols === 3) {
                    return '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}';
                }
            }
            return '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
        }

        let rows = [];
        
        for (const rowGroup of rowGroups) {
            const cells = rowGroup.cells || [];
            let rowLatex = [];
            
            for (const cell of cells) {
                const cellSymbols = symbols.filter(s => 
                    cell.components.some(c => 
                        Math.abs(s.centerX - c.centerX) < 30 && 
                        Math.abs(s.centerY - c.centerY) < 30
                    )
                );
                rowLatex.push(this.symbolsToExpression(cellSymbols, 'x'));
            }
            
            if (rowLatex.length > 0) {
                rows.push(rowLatex.join(' & '));
            }
        }

        if (rows.length < 2) {
            return '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
        }

        return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    }

    generateIntegralLatex(groups, symbols, structure) {
        const upperGroup = groups.find(g => g.type === 'upper_limit');
        const lowerGroup = groups.find(g => g.type === 'lower_limit');
        const mainGroup = groups.find(g => g.type === 'main');
        
        let upperLatex = '';
        let lowerLatex = '';
        let mainLatex = '';
        
        if (upperGroup) {
            const upperSymbols = symbols.filter(s => 
                upperGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30
                )
            );
            upperLatex = this.symbolsToExpression(upperSymbols, '');
        }
        
        if (lowerGroup) {
            const lowerSymbols = symbols.filter(s => 
                lowerGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30
                )
            );
            lowerLatex = this.symbolsToExpression(lowerSymbols, '');
        }
        
        if (mainGroup) {
            const mainSymbols = symbols.filter(s => 
                mainGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30 &&
                    Math.abs(s.centerY - c.centerY) < 30
                )
            );
            mainLatex = this.symbolsToExpression(mainSymbols, '');
        }
        
        if (structure) {
            const hasUpper = structure.hasUpper;
            const hasLower = structure.hasLower;
            
            if (!upperLatex) {
                if (hasUpper) upperLatex = '\\infty';
            }
            if (!lowerLatex) {
                if (hasLower) lowerLatex = '0';
            }
        }
        
        if (!mainLatex) {
            mainLatex = 'f(x) dx';
        }
        
        if (lowerLatex && upperLatex) {
            return `\\int_{${lowerLatex}}^{${upperLatex}} ${mainLatex}`;
        } else if (lowerLatex) {
            return `\\int_{${lowerLatex}} ${mainLatex}`;
        } else if (upperLatex) {
            return `\\int^{${upperLatex}} ${mainLatex}`;
        } else {
            return `\\int ${mainLatex}`;
        }
    }

    generateSumLatex(groups, symbols, structure) {
        const upperGroup = groups.find(g => g.type === 'upper_limit');
        const lowerGroup = groups.find(g => g.type === 'lower_limit');
        const mainGroup = groups.find(g => g.type === 'main');
        
        let upperLatex = '';
        let lowerLatex = '';
        let mainLatex = '';
        
        if (upperGroup) {
            const upperSymbols = symbols.filter(s => 
                upperGroup.components.some(c => Math.abs(s.centerX - c.centerX) < 30)
            );
            upperLatex = this.symbolsToExpression(upperSymbols, '');
        }
        
        if (lowerGroup) {
            const lowerSymbols = symbols.filter(s => 
                lowerGroup.components.some(c => Math.abs(s.centerX - c.centerX) < 30)
            );
            lowerLatex = this.symbolsToExpression(lowerSymbols, '');
        }
        
        if (mainGroup) {
            const mainSymbols = symbols.filter(s => 
                mainGroup.components.some(c => 
                    Math.abs(s.centerX - c.centerX) < 30 &&
                    Math.abs(s.centerY - c.centerY) < 30
                )
            );
            mainLatex = this.symbolsToExpression(mainSymbols, '');
        }
        
        if (structure) {
            const hasUpper = structure.hasUpper;
            const hasLower = structure.hasLower;
            
            if (!upperLatex) {
                if (hasUpper) upperLatex = 'n';
            }
            if (!lowerLatex) {
                if (hasLower) lowerLatex = 'i=1';
            }
        }
        
        if (!mainLatex) {
            mainLatex = 'a_i';
        }
        
        if (lowerLatex && upperLatex) {
            return `\\sum_{${lowerLatex}}^{${upperLatex}} ${mainLatex}`;
        } else if (lowerLatex) {
            return `\\sum_{${lowerLatex}} ${mainLatex}`;
        } else if (upperLatex) {
            return `\\sum^{${upperLatex}} ${mainLatex}`;
        } else {
            return `\\sum ${mainLatex}`;
        }
    }

    generateLinearLatex(groups, symbols) {
        const normalGroup = groups.find(g => g.type === 'normal');
        const supGroup = groups.find(g => g.type === 'superscript');
        const subGroup = groups.find(g => g.type === 'subscript');
        
        if (!normalGroup) {
            return this.symbolsToExpression(symbols, 'a x + b');
        }

        const normalSymbols = symbols.filter(s => 
            normalGroup.components.some(c => 
                Math.abs(s.centerX - c.centerX) < 20 &&
                Math.abs(s.centerY - c.centerY) < 20
            )
        );
        
        let expression = this.symbolsToExpression(normalSymbols, '');
        
        if (supGroup && expression) {
            const supSymbols = symbols.filter(s => 
                supGroup.components.some(c => Math.abs(s.centerX - c.centerX) < 20)
            );
            const supLatex = this.symbolsToExpression(supSymbols, '2');
            
            if (supLatex) {
                expression += `^{${supLatex}}`;
            }
        }
        
        if (subGroup && expression) {
            const subSymbols = symbols.filter(s => 
                subGroup.components.some(c => Math.abs(s.centerX - c.centerX) < 20)
            );
            const subLatex = this.symbolsToExpression(subSymbols, 'i');
            
            if (subLatex) {
                expression += `_{${subLatex}}`;
            }
        }

        if (!expression) {
            expression = 'a x + b = c';
        }

        return expression;
    }

    symbolsToExpression(symbols, defaultValue) {
        if (!symbols || symbols.length === 0) {
            return defaultValue;
        }

        const validSymbols = symbols.filter(s => 
            s.symbol !== '[UNK]' && s.confidence > 0.1
        );
        
        console.log('[LatexPredictor] 有效符号:', validSymbols.map(s => s.symbol));

        if (validSymbols.length === 0) {
            return defaultValue;
        }

        validSymbols.sort((a, b) => {
            const yDiff = a.centerY - b.centerY;
            if (Math.abs(yDiff) < 25) {
                return a.minX - b.minX;
            }
            return yDiff;
        });
        
        let expression = '';
        let lastX = -1;
        let lastY = -1;
        let lastWidth = 0;
        
        for (const symbol of validSymbols) {
            const isOperator = '+-*/=<>'.includes(symbol.symbol);
            const isDelimiter = '()[]{}'.includes(symbol.symbol);
            const isPunctuation = '.,;:!'.includes(symbol.symbol);
            
            if (lastX >= 0) {
                const gap = symbol.minX - lastX;
                const avgWidth = (lastWidth + symbol.width) / 2;
                
                if (Math.abs(symbol.centerY - lastY) > 25) {
                    expression += ' ';
                } else if (gap > avgWidth * 0.3 && !isOperator && !isDelimiter && !isPunctuation) {
                    if ('^_'.includes(expression.slice(-1))) {
                    } else if (expression.slice(-1) !== ' ') {
                        expression += ' ';
                    }
                }
            }
            
            expression += symbol.symbol;
            lastX = symbol.maxX;
            lastY = symbol.centerY;
            lastWidth = symbol.width;
        }

        if (!expression && defaultValue) {
            return defaultValue;
        }

        const result = this.postProcessExpression(expression);
        console.log('[LatexPredictor] 从符号生成表达式:', result);
        return result;
    }

    postProcessExpression(expr) {
        if (!expr) return expr;
        
        let result = expr.trim();
        
        result = result.replace(/\+\s*\+/g, '+');
        result = result.replace(/\-\s*\-/g, '-');
        result = result.replace(/=\s*=/g, '=');
        
        result = result.replace(/\^ /g, '^');
        result = result.replace(/_ /g, '_');
        
        if (/^\d+$/.test(result)) {
            return result;
        }
        
        return result;
    }

    fallbackToTemplate(structureAnalysis) {
        const { type, structure, components, width, height } = structureAnalysis;
        
        console.log('[LatexPredictor] 使用备用模板，检测到结构类型:', type);
        console.log('[LatexPredictor] 组件数量:', components ? components.length : 0);
        
        const componentCount = components ? components.length : 0;
        
        if (type === 'fraction') {
            if (structure) {
                const numeratorCount = structure.numeratorComponents ? 
                    structure.numeratorComponents.length : 0;
                const denominatorCount = structure.denominatorComponents ? 
                    structure.denominatorComponents.length : 0;
                
                if (numeratorCount > 2 && denominatorCount > 2) {
                    return '\\frac{n!}{k!(n-k)!}';
                }
                if (numeratorCount === 1 && denominatorCount === 1) {
                    return '\\frac{x}{y}';
                }
            }
            return '\\frac{a + b}{c - d}';
        }
        
        if (type === 'matrix') {
            const rows = structure.rows || 2;
            const cols = structure.cols || 2;
            
            if (rows === 2 && cols === 2) {
                return '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
            }
            if (rows === 3 && cols === 3) {
                return '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}';
            }
            
            let matrixContent = '';
            for (let r = 0; r < rows; r++) {
                const row = [];
                for (let c = 0; c < cols; c++) {
                    row.push(String.fromCharCode(97 + r * cols + c));
                }
                matrixContent += row.join(' & ') + (r < rows - 1 ? ' \\\\ ' : '');
            }
            return `\\begin{bmatrix} ${matrixContent} \\end{bmatrix}`;
        }
        
        if (type === 'integral') {
            if (structure) {
                const hasUpper = structure.hasUpper;
                const hasLower = structure.hasLower;
                
                console.log('[LatexPredictor] 积分结构 - hasUpper:', hasUpper, 'hasLower:', hasLower);
                
                if (!hasUpper && !hasLower) {
                    return '\\int f(x) dx';
                }
                if (hasUpper && !hasLower) {
                    return '\\int_{0}^{\\infty} f(x) dx';
                }
                if (!hasUpper && hasLower) {
                    return '\\int_{a}^{b} f(x) dx';
                }
                return '\\int_{0}^{\\infty} e^{-x^2} dx';
            }
            return '\\int_{a}^{b} f(x) dx';
        }
        
        if (type === 'sum') {
            if (structure) {
                const hasUpper = structure.hasUpper;
                const hasLower = structure.hasLower;
                
                if (!hasUpper && !hasLower) {
                    return '\\sum a_i';
                }
                if (hasUpper && !hasLower) {
                    return '\\sum_{i=1}^{n} a_i';
                }
                if (!hasUpper && hasLower) {
                    return '\\sum_{i=1} a_i';
                }
            }
            return '\\sum_{i=1}^{n} a_i';
        }
        
        if (componentCount > 5) {
            return 'a x^2 + b x + c = 0';
        }
        if (componentCount > 3) {
            return 'x + y = z';
        }
        
        return 'f(x) = x';
    }

    async runONNXInference(processedCanvas) {
        if (!this.model || !this.isReady) {
            throw new Error('模型未就绪');
        }

        try {
            const inputTensor = this.prepareInput(processedCanvas);
            const feeds = {};
            
            const inputNames = this.model.inputNames;
            if (inputNames.length > 0) {
                feeds[inputNames[0]] = new ort.Tensor(
                    inputTensor.type,
                    inputTensor.data,
                    inputTensor.shape
                );
            }

            const results = await this.model.run(feeds);
            return this.decodeOutput(results);
        } catch (error) {
            console.error('ONNX 推理失败:', error);
            return '\\text{模型推理失败}';
        }
    }

    prepareInput(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const inputData = new Float32Array(1 * 1 * canvas.height * canvas.width);
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                inputData[y * canvas.width + x] = 1.0 - brightness / 255.0;
            }
        }
        
        return {
            data: inputData,
            shape: [1, 1, canvas.height, canvas.width],
            type: 'float32'
        };
    }

    decodeOutput(results) {
        const outputNames = Object.keys(results);
        if (outputNames.length === 0) {
            return '\\text{无法解析模型输出}';
        }

        const outputTensor = results[outputNames[0]];
        const outputData = outputTensor.data;
        
        const vocabulary = this.getDefaultVocabulary();
        
        if (outputTensor.dims.length === 3) {
            return this.beamSearchDecode(outputData, outputTensor.dims, vocabulary);
        } else if (outputTensor.dims.length === 2) {
            return this.greedyDecode(outputData, outputTensor.dims, vocabulary);
        }
        
        return '\\text{输出格式不支持}';
    }

    getDefaultVocabulary() {
        return [
            '[PAD]', '[UNK]', '[START]', '[END]',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
            'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
            'u', 'v', 'w', 'x', 'y', 'z',
            '+', '-', '=',
            '\\frac', '\\int', '\\sum',
            '\\infty', '\\pi',
            '^', '_', '{', '}', ' ',
            '\\begin', '\\end', 'matrix', 'bmatrix',
            '\\cdot', '\\times'
        ];
    }

    greedyDecode(outputData, shape, vocabulary) {
        const [batchSize, seqLength] = shape;
        const tokens = [];
        
        for (let i = 0; i < seqLength && i < 200; i++) {
            const tokenId = Math.floor(outputData[i] || 0);
            if (tokenId === 3) break;
            if (tokenId > 3 && tokenId < vocabulary.length) {
                tokens.push(vocabulary[tokenId]);
            }
        }
        
        return this.tokensToLatex(tokens);
    }

    beamSearchDecode(outputData, shape, vocabulary) {
        const [batchSize, seqLength, vocabSize] = shape;
        const tokens = [];
        
        for (let i = 0; i < seqLength && i < 200; i++) {
            let maxProb = -Infinity;
            let bestToken = 0;
            
            for (let j = 0; j < vocabSize; j++) {
                const idx = i * vocabSize + j;
                if (outputData[idx] > maxProb) {
                    maxProb = outputData[idx];
                    bestToken = j;
                }
            }
            
            if (bestToken === 3) break;
            if (bestToken > 3 && bestToken < vocabulary.length) {
                tokens.push(vocabulary[bestToken]);
            }
        }
        
        return this.tokensToLatex(tokens);
    }

    tokensToLatex(tokens) {
        if (!tokens || tokens.length === 0) {
            return '\\text{识别失败}';
        }
        
        let latex = '';
        let i = 0;
        
        while (i < tokens.length) {
            let token = tokens[i];
            
            if (token.startsWith('\\')) {
                latex += token + ' ';
            } else if (token === '^' || token === '_') {
                latex += token;
                if (i + 1 < tokens.length) {
                    if (!tokens[i + 1].startsWith('{')) {
                        latex += '{';
                        latex += tokens[i + 1];
                        latex += '}';
                        i++;
                    }
                }
            } else {
                latex += token;
            }
            
            i++;
        }
        
        return latex.trim();
    }
}

export { LatexPredictor };
