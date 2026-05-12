class CellLocator {
    constructor(options = {}) {
        this.cellSize = options.cellSize || 50;
    }

    setCellSize(s) { this.cellSize = s; }

    _estimateDotSpacing(dots, axis) {
        if (dots.length < 2) return this.cellSize * 0.3;
        const key = axis === 'x' ? 'centerX' : 'centerY';
        const sorted = [...dots].sort((a, b) => a[key] - b[key]);
        const diffs = [];
        for (let i = 1; i < sorted.length; i++) {
            const d = sorted[i][key] - sorted[i - 1][key];
            if (d > 2) diffs.push(d);
        }
        if (diffs.length === 0) return this.cellSize * 0.3;
        diffs.sort((a, b) => a - b);
        const q1 = diffs[Math.floor(diffs.length * 0.25)];
        const q3 = diffs[Math.floor(diffs.length * 0.75)];
        const iqr = q3 - q1;
        const filtered = diffs.filter(d => d >= q1 - 1.5 * iqr && d <= q3 + 1.5 * iqr);
        if (filtered.length === 0) return diffs[Math.floor(diffs.length / 2)];
        return filtered.reduce((a, b) => a + b, 0) / filtered.length;
    }

    _clusterByY(dots, dY) {
        if (dots.length === 0) return [];
        const sorted = [...dots].sort((a, b) => a.centerY - b.centerY);
        const rows = [];
        let currentRow = [sorted[0]];
        rows.push(currentRow);
        const thresh = dY * 0.6;
        for (let i = 1; i < sorted.length; i++) {
            const dot = sorted[i];
            const lastRow = rows[rows.length - 1];
            const lastMean = lastRow.reduce((s, d) => s + d.centerY, 0) / lastRow.length;
            if (Math.abs(dot.centerY - lastMean) < thresh * 2) {
                lastRow.push(dot);
            } else {
                rows.push([dot]);
            }
        }
        return rows;
    }

    _clusterByX(dots, dX) {
        if (dots.length === 0) return [];
        const sorted = [...dots].sort((a, b) => a.centerX - b.centerX);
        const cols = [];
        let currentCol = [sorted[0]];
        cols.push(currentCol);
        const thresh = dX * 0.6;
        for (let i = 1; i < sorted.length; i++) {
            const dot = sorted[i];
            const lastCol = cols[cols.length - 1];
            const lastMean = lastCol.reduce((s, d) => s + d.centerX, 0) / lastCol.length;
            if (Math.abs(dot.centerX - lastMean) < thresh * 2) {
                lastCol.push(dot);
            } else {
                cols.push([dot]);
            }
        }
        return cols;
    }

    _getDotAt(dots, x, y, maxDist) {
        let best = null, bestDist = Infinity;
        for (const d of dots) {
            const dist = Math.sqrt((d.centerX - x) ** 2 + (d.centerY - y) ** 2);
            if (dist < bestDist && dist <= maxDist) {
                bestDist = dist;
                best = d;
            }
        }
        return best;
    }

    locateCells(dots, type = '2x3') {
        if (dots.length === 0) {
            console.log('[CellLocator] 没有点');
            return [];
        }

        console.log('[CellLocator] ====== 开始定位 ======');
        console.log('[CellLocator] 输入点数:', dots.length);

        const ROWS_PER_CELL = type === '2x4' ? 4 : 3;
        const COLS_PER_CELL = 2;

        const dY = this._estimateDotSpacing(dots, 'y');
        const dX = this._estimateDotSpacing(dots, 'x');
        console.log('[CellLocator] 点间距: dX=' + dX.toFixed(1) + ', dY=' + dY.toFixed(1));

        const dotRows = this._clusterByY(dots, dY);
        console.log('[CellLocator] 检测到', dotRows.length, '行点');

        const cells = [];
        const cellW = dX * 2.6;
        const cellH = dY * (ROWS_PER_CELL + 0.4);

        for (let cr = 0; cr < dotRows.length; cr += ROWS_PER_CELL) {
            const cellRowIndices = [];
            for (let i = 0; i < ROWS_PER_CELL; i++) {
                if (cr + i < dotRows.length) cellRowIndices.push(cr + i);
            }

            const cellRowDots = cellRowIndices.map(i => dotRows[i]).flat();
            if (cellRowDots.length === 0) continue;

            const dotCols = this._clusterByX(cellRowDots, dX);
            console.log('[CellLocator] 单元格行', Math.floor(cr / ROWS_PER_CELL), ':', dotCols.length, '列点');

            const rowMeanYs = cellRowIndices.map(ri => {
                const row = dotRows[ri];
                return row.reduce((s, d) => s + d.centerY, 0) / row.length;
            });

            for (let cc = 0; cc < dotCols.length; cc += COLS_PER_CELL) {
                const cellColIndices = [];
                for (let i = 0; i < COLS_PER_CELL; i++) {
                    if (cc + i < dotCols.length) cellColIndices.push(cc + i);
                }

                if (cellColIndices.length === 0) continue;

                const colMeanXs = cellColIndices.map(ci => {
                    const col = dotCols[ci];
                    return col.reduce((s, d) => s + d.centerX, 0) / col.length;
                });

                const pattern = Array(ROWS_PER_CELL).fill(null).map(() => [false, false]);
                let hasDot = false;
                const cellDots = [];

                for (let r = 0; r < ROWS_PER_CELL; r++) {
                    for (let c = 0; c < COLS_PER_CELL; c++) {
                        if (r >= rowMeanYs.length || c >= colMeanXs.length) continue;

                        const expectedX = colMeanXs[c];
                        const expectedY = rowMeanYs[r];
                        const maxDist = Math.max(dX, dY) * 0.7;

                        const found = this._getDotAt(dots, expectedX, expectedY, maxDist);
                        if (found) {
                            pattern[r][c] = true;
                            hasDot = true;
                            cellDots.push(found);
                        }
                    }
                }

                if (!hasDot) continue;

                let code = 0, idx = 0;
                for (let col = 0; col < COLS_PER_CELL; col++) {
                    for (let row = 0; row < ROWS_PER_CELL; row++) {
                        if (pattern[row][col]) code |= (1 << idx);
                        idx++;
                    }
                }

                const cx = colMeanXs.reduce((a, b) => a + b, 0) / colMeanXs.length;
                const cy = rowMeanYs.reduce((a, b) => a + b, 0) / rowMeanYs.length;

                cells.push({
                    x: cx - cellW / 2,
                    y: cy - cellH / 2,
                    width: cellW,
                    height: cellH,
                    centerX: cx,
                    centerY: cy,
                    pattern: pattern,
                    code: code,
                    dots: cellDots
                });
            }
        }

        cells.sort((a, b) => {
            const rowDiff = a.centerY - b.centerY;
            if (Math.abs(rowDiff) > cellH * 0.3) return rowDiff;
            return a.centerX - b.centerX;
        });

        console.log('[CellLocator] 生成', cells.length, '个单元格');
        return cells;
    }

    markDots(ctx, dots) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.strokeStyle = '#006600';
        ctx.lineWidth = 1.5;
        for (const d of dots) {
            const r = Math.max(d.width, d.height) / 2 + 2;
            ctx.beginPath();
            ctx.arc(d.centerX, d.centerY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    markCells(ctx, cells) {
        ctx.lineWidth = 2;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const hue = (i * 37) % 360;
            ctx.strokeStyle = `hsl(${hue}, 85%, 50%)`;
            ctx.strokeRect(cell.x - 1, cell.y - 1, cell.width + 2, cell.height + 2);
            
            const braille = String.fromCharCode(0x2800 + cell.code);
            ctx.fillStyle = '#0000cc';
            ctx.font = 'bold 15px Arial';
            ctx.fillText(braille, cell.centerX - 8, cell.y - 5);
            
            ctx.fillStyle = '#cc0000';
            ctx.font = '10px Arial';
            ctx.fillText('#' + (i + 1), cell.x + 2, cell.y + cell.height + 12);
        }
    }
}

export { CellLocator };
