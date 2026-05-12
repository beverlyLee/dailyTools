class A4LayoutEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.pageWidthMm = 210;
        this.pageHeightMm = 297;
        this.dpi = 150;
        this.pixelsPerMm = this.dpi / 25.4;
        
        this.pageWidthPx = Math.round(this.pageWidthMm * this.pixelsPerMm);
        this.pageHeightPx = Math.round(this.pageHeightMm * this.pixelsPerMm);
        
        this.marginMm = 15;
        this.blockGapMm = 8;
        this.blocks = [];
        this.pages = [];
    }
    
    setMargin(mm) {
        this.marginMm = mm;
    }
    
    setBlockGap(mm) {
        this.blockGapMm = mm;
    }
    
    setBlocks(blocks) {
        this.blocks = blocks.filter(b => b.selected);
    }
    
    mmToPx(mm) {
        return mm * this.pixelsPerMm;
    }
    
    layout() {
        if (this.blocks.length === 0) {
            this.pages = [];
            return [];
        }
        
        this.pages = [];
        
        const contentWidthPx = this.pageWidthPx - 2 * this.mmToPx(this.marginMm);
        const contentHeightPx = this.pageHeightPx - 2 * this.mmToPx(this.marginMm);
        const blockGapPx = this.mmToPx(this.blockGapMm);
        
        let currentPage = [];
        let currentY = 0;
        
        for (const block of this.blocks) {
            const scaleFactor = contentWidthPx / block.width;
            const scaledHeight = block.height * scaleFactor;
            
            if (currentPage.length > 0 &&
                currentY + blockGapPx + scaledHeight > contentHeightPx) {
                
                this.pages.push({
                    blocks: currentPage,
                    contentWidthPx,
                    contentHeightPx
                });
                currentPage = [];
                currentY = 0;
            }
            
            const blockLayout = {
                canvas: block.canvas,
                originalWidth: block.width,
                originalHeight: block.height,
                x: 0,
                y: currentY,
                width: contentWidthPx,
                height: scaledHeight,
                scaleFactor: scaleFactor
            };
            
            currentPage.push(blockLayout);
            currentY += scaledHeight + blockGapPx;
        }
        
        if (currentPage.length > 0) {
            this.pages.push({
                blocks: currentPage,
                contentWidthPx,
                contentHeightPx
            });
        }
        
        return this.pages;
    }
    
    preview(pageIndex = 0) {
        if (this.pages.length === 0) {
            return;
        }
        
        const page = this.pages[pageIndex];
        
        this.canvas.width = this.pageWidthPx;
        this.canvas.height = this.pageHeightPx;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.pageWidthPx, this.pageHeightPx);
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.mmToPx(this.marginMm) - 2,
            this.mmToPx(this.marginMm) - 2,
            page.contentWidthPx + 4,
            page.contentHeightPx + 4
        );
        
        const marginX = this.mmToPx(this.marginMm);
        const marginY = this.mmToPx(this.marginMm);
        
        for (const blockLayout of page.blocks) {
            this.ctx.drawImage(
                blockLayout.canvas,
                marginX + blockLayout.x,
                marginY + blockLayout.y,
                blockLayout.width,
                blockLayout.height
            );
            
            this.ctx.strokeStyle = '#ddd';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                marginX + blockLayout.x,
                marginY + blockLayout.y,
                blockLayout.width,
                blockLayout.height
            );
        }
        
        this.ctx.fillStyle = '#999';
        this.ctx.font = `${this.mmToPx(3)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `第 ${pageIndex + 1} 页 / 共 ${this.pages.length} 页`,
            this.pageWidthPx / 2,
            this.pageHeightPx - this.mmToPx(5)
        );
    }
    
    async exportToPDF(filename = '错题本.pdf') {
        if (this.pages.length === 0) {
            throw new Error('没有可导出的内容');
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const marginPx = this.mmToPx(this.marginMm);
        
        for (let pageIndex = 0; pageIndex < this.pages.length; pageIndex++) {
            if (pageIndex > 0) {
                pdf.addPage();
            }
            
            const page = this.pages[pageIndex];
            
            for (const blockLayout of page.blocks) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = blockLayout.originalWidth;
                tempCanvas.height = blockLayout.originalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(blockLayout.canvas, 0, 0);
                
                const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
                
                const x = this.marginMm;
                const y = this.marginMm + (blockLayout.y / this.pixelsPerMm);
                const width = page.contentWidthPx / this.pixelsPerMm;
                const height = blockLayout.height / this.pixelsPerMm;
                
                pdf.addImage(
                    imgData,
                    'JPEG',
                    x,
                    y,
                    width,
                    height
                );
            }
        }
        
        pdf.save(filename);
    }
    
    getPageCount() {
        return this.pages.length;
    }
}
