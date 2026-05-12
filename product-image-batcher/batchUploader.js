class BatchUploader {
    constructor() {
        this.files = [];
        this.downloadBlob = null;
        this.init();
    }

    init() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.fileCount = document.getElementById('fileCount');
        this.fileListSection = document.getElementById('fileListSection');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.processBtn = document.getElementById('processBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.previewArea = document.getElementById('previewArea');
        this.previewImage = document.getElementById('previewImage');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultSection = document.getElementById('resultSection');
        this.resultTitle = document.getElementById('resultTitle');
        this.resultDesc = document.getElementById('resultDesc');
        this.downloadBtn = document.getElementById('downloadBtn');

        this.modeRadios = document.querySelectorAll('input[name="mode"]');
        this.ratioSelect = document.getElementById('ratio');
        this.targetSizeSelect = document.getElementById('targetSize');
        this.bgColorInput = document.getElementById('bgColor');
        this.bgColorText = document.getElementById('bgColorText');
        this.qualityRange = document.getElementById('quality');
        this.qualityValue = document.getElementById('qualityValue');

        this.bindEvents();
    }

    bindEvents() {
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
            if (e.dataTransfer && e.dataTransfer.files) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        this.clearAllBtn.addEventListener('click', () => this.clearAllFiles());
        this.previewBtn.addEventListener('click', () => this.generatePreview());
        this.processBtn.addEventListener('click', () => this.processImages());
        this.downloadBtn.addEventListener('click', () => this.downloadResult());

        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.mode-btn').forEach(el => el.classList.remove('active'));
                radio.closest('.mode-btn').classList.add('active');
            });
        });

        this.bgColorInput.addEventListener('change', (e) => {
            this.bgColorText.value = e.target.value;
        });

        this.bgColorText.addEventListener('change', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                this.bgColorInput.value = color;
            }
        });

        this.qualityRange.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value;
        });
    }

    handleFiles(fileList) {
        if (!fileList || fileList.length === 0) return;

        const imageFiles = Array.from(fileList).filter(file => 
            file.type && file.type.startsWith('image/')
        );

        imageFiles.forEach(file => {
            if (this.files.length < 100) {
                this.files.push(file);
            }
        });

        this.updateFileList();
    }

    updateFileList() {
        this.fileList.innerHTML = '';
        this.fileCount.textContent = this.files.length;
        this.fileListSection.style.display = this.files.length > 0 ? 'block' : 'none';
        this.processBtn.disabled = this.files.length === 0;
        this.previewBtn.disabled = this.files.length === 0;

        this.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const reader = new FileReader();
            reader.onload = (e) => {
                const thumb = item.querySelector('.file-thumb');
                if (thumb) {
                    thumb.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);

            item.innerHTML = `
                <img class="file-thumb" src="" alt="缩略图">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file-btn" title="删除">✕</button>
            `;

            item.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(index);
            });

            this.fileList.appendChild(item);
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
    }

    clearAllFiles() {
        this.files = [];
        this.fileInput.value = '';
        this.previewArea.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.updateFileList();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getSettings() {
        const modeRadio = document.querySelector('input[name="mode"]:checked');
        return {
            mode: modeRadio ? modeRadio.value : 'smart',
            ratio: this.ratioSelect.value,
            targetSize: this.targetSizeSelect.value,
            bgColor: this.bgColorInput.value,
            quality: this.qualityRange.value
        };
    }

    async generatePreview() {
        if (this.files.length === 0) return;

        const settings = this.getSettings();
        const formData = new FormData();
        formData.append('image', this.files[0]);
        formData.append('mode', settings.mode);
        formData.append('ratio', settings.ratio);
        formData.append('targetSize', settings.targetSize);
        formData.append('bgColor', settings.bgColor);
        formData.append('quality', settings.quality);

        this.previewBtn.disabled = true;
        this.previewBtn.textContent = '⏳ 生成预览中...';

        try {
            const response = await fetch('/api/preview', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '预览生成失败');
            }

            const data = await response.json();
            this.previewImage.src = data.preview;
            this.previewArea.style.display = 'block';
        } catch (error) {
            alert('预览生成失败: ' + error.message);
            console.error('预览错误:', error);
        } finally {
            this.previewBtn.disabled = false;
            this.previewBtn.textContent = '👁️ 预览效果';
        }
    }

    async processImages() {
        if (this.files.length === 0) return;

        const settings = this.getSettings();
        const formData = new FormData();

        this.files.forEach(file => {
            formData.append('images', file);
        });
        formData.append('mode', settings.mode);
        formData.append('ratio', settings.ratio);
        formData.append('targetSize', settings.targetSize);
        formData.append('bgColor', settings.bgColor);
        formData.append('quality', settings.quality);

        this.processBtn.disabled = true;
        this.processBtn.textContent = '⏳ 处理中...';
        this.progressSection.style.display = 'block';
        this.resultSection.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = `0/${this.files.length}`;

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMsg = '处理失败';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = await response.text() || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            this.downloadBlob = blob;

            this.progressFill.style.width = '100%';
            this.progressText.textContent = `${this.files.length}/${this.files.length}`;

            setTimeout(() => {
                this.resultSection.style.display = 'block';
                this.resultTitle.textContent = '处理完成!';
                this.resultDesc.textContent = `已成功处理 ${this.files.length} 张图片`;
                this.processBtn.textContent = '🚀 开始批量处理';
                this.processBtn.disabled = false;
            }, 500);

        } catch (error) {
            alert('处理失败: ' + error.message);
            console.error('处理错误:', error);
            this.processBtn.textContent = '🚀 开始批量处理';
            this.processBtn.disabled = false;
            this.progressSection.style.display = 'none';
        }
    }

    downloadResult() {
        if (!this.downloadBlob) return;

        const url = URL.createObjectURL(this.downloadBlob);
        const a = document.createElement('a');
        a.href = url;

        const timestamp = new Date().toISOString().slice(0, 10);
        if (this.files.length === 1) {
            const originalName = this.files[0].name;
            const ext = originalName.substring(originalName.lastIndexOf('.'));
            const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
            a.download = `${baseName}_processed${ext}`;
        } else {
            a.download = `processed_images_${timestamp}.zip`;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BatchUploader();
});