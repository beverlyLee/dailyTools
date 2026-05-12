import { ImagePreprocessor } from './ImagePreprocessor.js';
import { LineDetector } from './LineDetector.js';
import { NoteHeadLocator } from './NoteHeadLocator.js';
import { PitchMapper } from './PitchMapper.js';
import { ChordDetector } from './ChordDetector.js';

class SheetMusicReader {
    constructor() {
        console.log('[SheetMusicReader] 初始化几何解析模式乐谱识别...');
        
        this.originalImage = null;
        this.originalImageData = null;
        this.preprocessedData = null;
        this.mappedNotes = [];
        this.chordResult = null;
        this.currentScale = 1;
        this.annotatedCanvas = null;
        
        this.imagePreprocessor = new ImagePreprocessor({
            adaptiveWindowSize: 31,
            adaptiveConstant: 15,
            minConnectedComponentSize: 4
        });
        
        this.lineDetector = new LineDetector();
        this.noteLocator = new NoteHeadLocator({
            minNoteSize: 5,
            maxNoteSize: 60,
            minAspectRatio: 0.4,
            maxAspectRatio: 2.5
        });
        this.pitchMapper = new PitchMapper({
            tolerance: 0.3
        });
        this.chordDetector = new ChordDetector({
            chordDistance: 20,
            minChordSize: 2,
            maxYDiff: 100
        });
        
        this.options = {
            clef: 'auto',
            annotationColor: '#e74c3c',
            usePreprocessing: true
        };
        
        this.initElements();
        this.initEventListeners();
        
        console.log('[SheetMusicReader] 初始化完成（几何解析模式）');
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.noteList = document.getElementById('noteList');
        this.notesContainer = document.getElementById('notesContainer');
        this.outputBox = document.getElementById('outputBox');
        this.outputText = document.getElementById('outputText');
        this.copyOutputBtn = document.getElementById('copyOutputBtn');
        
        this.originalCanvas = document.getElementById('originalCanvas');
        this.resultCanvas = document.getElementById('resultCanvas');
        
        this.clefSelect = document.getElementById('clefSelect');
        this.colorSelect = document.getElementById('colorSelect');
        
        this.recognizeBtn = document.getElementById('recognizeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    initEventListeners() {
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (this.clefSelect) {
            this.clefSelect.addEventListener('change', (e) => {
                this.options.clef = e.target.value;
                if (this.originalImageData && this.mappedNotes.length > 0) {
                    this.recognizeNotes();
                }
            });
        }
        
        if (this.colorSelect) {
            this.colorSelect.addEventListener('change', (e) => {
                this.options.annotationColor = e.target.value;
                if (this.chordResult && this.chordResult.all.length > 0) {
                    this.drawAnnotations();
                }
            });
        }
        
        if (this.recognizeBtn) {
            this.recognizeBtn.addEventListener('click', () => this.recognizeNotes());
        }
        
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.reset());
        }
        
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadResult());
        }
        
        if (this.copyOutputBtn) {
            this.copyOutputBtn.addEventListener('click', () => this.copyOutput());
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.add('dragover');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.remove('dragover');
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        const reader = new FileReader();
        const self = this;
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                self.originalImage = img;
                self.initCanvases(img);
                if (self.controls) {
                    self.controls.style.display = 'block';
                }
                if (self.previewSection) {
                    self.previewSection.style.display = 'block';
                }
                if (self.downloadBtn) {
                    self.downloadBtn.style.display = 'none';
                }
                if (self.noteList) {
                    self.noteList.style.display = 'none';
                }
                if (self.outputBox) {
                    self.outputBox.style.display = 'none';
                }
                self.mappedNotes = [];
                self.preprocessedData = null;
                self.chordResult = null;
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 800;
        let w = img.width;
        let h = img.height;
        
        if (w > maxWidth) {
            this.currentScale = maxWidth / w;
            w = maxWidth;
            h = Math.round(img.height * this.currentScale);
        } else {
            this.currentScale = 1;
        }
        
        if (this.originalCanvas) {
            this.originalCanvas.width = w;
            this.originalCanvas.height = h;
            const originalCtx = this.originalCanvas.getContext('2d');
            originalCtx.drawImage(img, 0, 0, w, h);
            this.originalImageData = originalCtx.getImageData(0, 0, w, h);
        }
        
        if (this.resultCanvas) {
            this.resultCanvas.width = w;
            this.resultCanvas.height = h;
            const resultCtx = this.resultCanvas.getContext('2d');
            resultCtx.drawImage(img, 0, 0, w, h);
        }
    }

    async recognizeNotes() {
        if (!this.originalImageData) {
            alert('请先上传乐谱图片');
            return;
        }
        
        if (this.recognizeBtn) {
            this.recognizeBtn.textContent = '解析中...';
            this.recognizeBtn.disabled = true;
        }
        
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            console.log('=== 开始几何解析 ===');
            console.log('图像尺寸:', this.originalImageData.width, 'x', this.originalImageData.height);
            
            if (this.options.usePreprocessing && !this.preprocessedData) {
                console.log('开始图像预处理...');
                this.preprocessedData = this.imagePreprocessor.process(this.originalImageData);
                console.log('预处理完成');
            }
            
            const lineResult = this.lineDetector.detect(
                this.originalImageData, 
                this.preprocessedData
            );
            console.log('谱表检测结果:', lineResult.staves.length, '个谱表,', lineResult.barLines.length, '个小节线');
            
            let staves = lineResult.staves;
            if (staves.length === 0) {
                staves = this.estimateStaves();
            }
            
            const noteHeads = this.noteLocator.locate(
                this.originalImageData, 
                staves, 
                this.preprocessedData
            );
            console.log('符头检测结果:', noteHeads.length, '个符头（纯几何检测）');
            
            let clef = this.options.clef;
            if (clef === 'auto') {
                clef = 'treble';
                console.log('自动检测谱号，默认使用高音谱号');
            }
            
            this.mappedNotes = this.pitchMapper.map(noteHeads, staves, clef);
            console.log('位置映射完成:', this.mappedNotes.length, '个符头');
            
            const lineSpacing = staves.length > 0 ? staves[0].lineSpacing || 15 : 15;
            this.chordResult = this.chordDetector.detect(this.mappedNotes, lineSpacing);
            console.log('和弦检测完成:', this.chordResult.chords.length, '个和弦,', this.chordResult.singleNotes.length, '个单音符');
            
            this.drawAnnotations();
            this.displayNoteList();
            this.displayOutput();
            
            if (this.downloadBtn) {
                this.downloadBtn.style.display = 'inline-block';
            }
            if (this.noteList) {
                this.noteList.style.display = 'block';
            }
            if (this.outputBox) {
                this.outputBox.style.display = 'block';
            }
            
            console.log('=== 几何解析完成 ===');
            
        } catch (error) {
            console.error('解析失败:', error);
            console.error('错误堆栈:', error.stack);
            alert('解析失败: ' + error.message);
        } finally {
            if (this.recognizeBtn) {
                this.recognizeBtn.textContent = '几何解析';
                this.recognizeBtn.disabled = false;
            }
        }
    }

    estimateStaves() {
        if (!this.originalImageData) return [];
        const height = this.originalImageData.height;
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

    drawAnnotations() {
        if (!this.resultCanvas || !this.originalImage || !this.chordResult) return;
        
        const ctx = this.resultCanvas.getContext('2d');
        const w = this.resultCanvas.width;
        const h = this.resultCanvas.height;
        
        ctx.drawImage(this.originalImage, 0, 0, w, h);
        
        ctx.fillStyle = this.options.annotationColor;
        ctx.strokeStyle = this.options.annotationColor;
        ctx.lineWidth = 2;
        
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        for (const item of this.chordResult.all) {
            const x = item.x;
            const y = item.y;
            
            if (item.isChord) {
                ctx.strokeStyle = '#e74c3c';
                ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
                
                if (item.boundingBox) {
                    const bb = item.boundingBox;
                    ctx.fillRect(bb.minX - 3, bb.minY - 3, bb.width + 6, bb.height + 6);
                    ctx.strokeRect(bb.minX - 3, bb.minY - 3, bb.width + 6, bb.height + 6);
                }
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                const pitchStr = item.allPitches.join(', ');
                const labelText = `[${pitchStr}]`;
                const labelWidth = ctx.measureText(labelText).width + 12;
                const labelHeight = 24;
                const labelY = item.boundingBox ? item.boundingBox.minY - 5 : y - 20;
                
                ctx.fillRect(x - labelWidth / 2, labelY - labelHeight, labelWidth, labelHeight);
                
                ctx.fillStyle = '#e74c3c';
                ctx.fillText(labelText, x, labelY);
                
            } else {
                const note = item.note;
                const labelY = y - Math.max(note.width, note.height) / 2 - 8;
                
                ctx.strokeStyle = this.options.annotationColor;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(note.width, note.height) / 2 + 3, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                const labelText = item.pitch;
                const labelWidth = ctx.measureText(labelText).width + 8;
                const labelHeight = 22;
                
                ctx.fillRect(x - labelWidth / 2, labelY - labelHeight, labelWidth, labelHeight);
                
                if (item.pitch === '[?]') {
                    ctx.fillStyle = '#999';
                } else {
                    ctx.fillStyle = this.options.annotationColor;
                }
                ctx.fillText(labelText, x, labelY);
            }
        }
        
        this.annotatedCanvas = this.resultCanvas;
    }

    displayNoteList() {
        if (!this.notesContainer || !this.chordResult) return;
        
        this.notesContainer.innerHTML = '';
        
        const allItems = this.chordResult.all;
        
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'note-item';
            
            if (item.isChord) {
                const pitches = item.allPitches;
                const noteCount = item.noteCount;
                
                itemDiv.innerHTML = `
                    <span class="note-name">🎹 和弦</span>
                    <span class="note-info">${i + 1}. ${noteCount}个音: [${pitches.join(', ')}] | 坐标: (${Math.round(item.x)}, ${Math.round(item.y)})</span>
                `;
            } else {
                const note = item.note;
                const position = note.position || '未知';
                const posText = note.isOnLine ? `线上(${position})` : (note.isInSpace ? `间中(${position})` : position);
                
                let pitchText = item.pitch;
                if (item.pitch === '[?]') {
                    pitchText = '<span style="color: #999; font-style: italic;">[?] 位置模糊</span>';
                    itemDiv.style.opacity = '0.7';
                }
                
                itemDiv.innerHTML = `
                    <span class="note-name">${pitchText}</span>
                    <span class="note-info">${i + 1}. ${note.filled ? '实心' : '空心'}符头 | ${posText} | 坐标: (${Math.round(note.x)}, ${Math.round(note.y)})</span>
                `;
            }
            
            this.notesContainer.appendChild(itemDiv);
        }
        
        if (allItems.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.color = '#999';
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.textContent = '未检测到符头。提示：请上传清晰的乐谱图片，符头必须位于线或间上。';
            this.notesContainer.appendChild(emptyDiv);
        }
    }

    displayOutput() {
        if (!this.outputText || !this.chordResult) return;
        
        let output = '=== 几何解析结果 ===\n';
        output += `模式: 纯几何解析（无音乐推理）\n`;
        output += `谱号: ${this.options.clef === 'auto' ? 'treble(自动)' : this.options.clef}\n\n`;
        
        const groupedByStaff = {};
        
        for (const item of this.chordResult.all) {
            const staffIndex = item.staffIndex !== undefined ? item.staffIndex : 0;
            if (!groupedByStaff[staffIndex]) {
                groupedByStaff[staffIndex] = [];
            }
            groupedByStaff[staffIndex].push(item);
        }
        
        const staffIndices = Object.keys(groupedByStaff).map(Number).sort((a, b) => a - b);
        
        for (const staffIndex of staffIndices) {
            const items = groupedByStaff[staffIndex];
            output += `--- 谱表 ${staffIndex + 1} ---\n`;
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const seqNum = i + 1;
                
                if (item.isChord) {
                    const pitchStr = item.allPitches.join(', ');
                    output += `第${seqNum}个和弦: [${pitchStr}] (x:${Math.round(item.x)}, y:${Math.round(item.y)})\n`;
                } else {
                    output += `第${seqNum}个音符: ${item.pitch} (x:${Math.round(item.x)}, y:${Math.round(item.y)})\n`;
                }
            }
            output += '\n';
        }
        
        const stats = `统计: ${this.chordResult.chords.length} 个和弦, ${this.chordResult.singleNotes.length} 个单音符, 总计 ${this.chordResult.all.length} 个元素`;
        output += stats;
        
        this.outputText.textContent = output;
    }

    copyOutput() {
        if (!this.outputText) return;
        
        const text = this.outputText.textContent;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (this.copyOutputBtn) {
                    const originalText = this.copyOutputBtn.textContent;
                    this.copyOutputBtn.textContent = '已复制!';
                    this.copyOutputBtn.disabled = true;
                    setTimeout(() => {
                        this.copyOutputBtn.textContent = originalText;
                        this.copyOutputBtn.disabled = false;
                    }, 2000);
                }
            }).catch(err => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            if (this.copyOutputBtn) {
                const originalText = this.copyOutputBtn.textContent;
                this.copyOutputBtn.textContent = '已复制!';
                this.copyOutputBtn.disabled = true;
                setTimeout(() => {
                    this.copyOutputBtn.textContent = originalText;
                    this.copyOutputBtn.disabled = false;
                }, 2000);
            }
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        }
        
        document.body.removeChild(textArea);
    }

    reset() {
        this.originalImage = null;
        this.originalImageData = null;
        this.preprocessedData = null;
        this.mappedNotes = [];
        this.chordResult = null;
        
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        if (this.controls) {
            this.controls.style.display = 'none';
        }
        if (this.previewSection) {
            this.previewSection.style.display = 'none';
        }
        if (this.downloadBtn) {
            this.downloadBtn.style.display = 'none';
        }
        if (this.noteList) {
            this.noteList.style.display = 'none';
        }
        if (this.outputBox) {
            this.outputBox.style.display = 'none';
        }
        
        if (this.clefSelect) {
            this.clefSelect.value = 'auto';
        }
        this.options.clef = 'auto';
    }

    downloadResult() {
        if (!this.annotatedCanvas) return;
        
        const link = document.createElement('a');
        link.download = 'geometric_analysis_' + Date.now() + '.png';
        link.href = this.annotatedCanvas.toDataURL('image/png');
        link.click();
    }
}

console.log('[main.js] 几何解析模式乐谱识别加载中...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('[main.js] DOM 已加载，初始化应用...');
    new SheetMusicReader();
});
