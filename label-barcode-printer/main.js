class LabelBarcodePrinterApp {
    constructor() {
        this.parser = new ExcelDataParser();
        this.generator = new BarcodeGenerator();
        this.layoutManager = new LabelLayoutManager();
        this.currentResult = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const generateBtn = document.getElementById('generateBtn');
        const exportBtn = document.getElementById('exportBtn');
        const printBtn = document.getElementById('printBtn');
        const loadSampleBtn = document.getElementById('loadSampleBtn');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.handleGenerate());
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }
        if (printBtn) {
            printBtn.addEventListener('click', () => this.handlePrint());
        }
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => this.handleLoadSample());
        }
    }

    async handleGenerate() {
        const dataInput = document.getElementById('dataInput');
        const barcodeType = document.getElementById('barcodeType').value;
        const paperWidth = parseInt(document.getElementById('paperWidth').value);
        const labelHeight = parseInt(document.getElementById('labelHeight').value);
        const fontSize = parseInt(document.getElementById('fontSize').value);

        const text = dataInput.value;
        const items = this.parser.parse(text);

        if (items.length === 0) {
            alert('请输入有效的数据！每行格式：物品名\t编号 或 物品名 编号');
            return;
        }

        try {
            const itemsWithBarcodes = await this.generator.generateAll(items, barcodeType, {
                fontSize: fontSize
            });

            this.currentResult = this.layoutManager.calculateLabelCanvas(itemsWithBarcodes, {
                paperWidth: paperWidth,
                labelHeight: labelHeight,
                fontSize: fontSize,
                barcodeType: barcodeType
            });

            this.renderPreview();
            this.updatePreviewInfo();
        } catch (error) {
            console.error('Error generating labels:', error);
            alert('生成标签时出错：' + error.message);
        }
    }

    renderPreview() {
        const previewCanvas = document.getElementById('previewCanvas');
        if (!previewCanvas || !this.currentResult) return;

        const preview = this.layoutManager.createPreviewCanvas(this.currentResult.canvas, 600);
        const ctx = previewCanvas.getContext('2d');
        
        previewCanvas.width = preview.width;
        previewCanvas.height = preview.height;
        
        ctx.drawImage(preview, 0, 0);
    }

    updatePreviewInfo() {
        const previewInfo = document.getElementById('previewInfo');
        if (!previewInfo || !this.currentResult) return;

        const info = this.currentResult;
        previewInfo.innerHTML = `
            <strong>生成结果：</strong><br>
            标签数量：${info.labelCount} 个<br>
            纸张宽度：${info.paperWidthMm}mm (${info.paperWidthPx}px)<br>
            总高度：${info.totalHeightMm.toFixed(1)}mm (${info.totalHeightPx}px)<br>
            可以点击"导出长图"下载或点击"打印"进行打印
        `;
    }

    handleExport() {
        if (!this.currentResult) {
            alert('请先生成预览！');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.layoutManager.downloadImage(
            this.currentResult.canvas,
            `labels_${timestamp}.png`
        );
    }

    handlePrint() {
        if (!this.currentResult) {
            alert('请先生成预览！');
            return;
        }

        this.layoutManager.print(this.currentResult.canvas);
    }

    handleLoadSample() {
        const sampleData = this.parser.getSampleData(10);
        const formatted = this.parser.formatSampleData(sampleData);
        document.getElementById('dataInput').value = formatted;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LabelBarcodePrinterApp();
});
