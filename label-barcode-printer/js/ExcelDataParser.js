class ExcelDataParser {
    constructor() {
        this.supportedSeparators = ['\t', '|', ',', ';', ' '];
    }

    parse(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const lines = text.trim().split('\n');
        const result = [];
        const separator = this.detectSeparator(lines);

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                return;
            }

            const item = this.parseLine(trimmedLine, separator);
            if (item) {
                item.lineNumber = index + 1;
                result.push(item);
            }
        });

        return result;
    }

    detectSeparator(lines) {
        if (!lines || lines.length === 0) {
            return '\t';
        }

        const firstLine = lines[0];
        for (const separator of this.supportedSeparators) {
            if (firstLine.includes(separator)) {
                return separator;
            }
        }

        return '\t';
    }

    parseLine(line, separator) {
        const parts = line.split(separator).map(part => part.trim()).filter(part => part.length > 0);
        
        if (parts.length === 0) {
            return null;
        }

        if (parts.length === 1) {
            const content = parts[0];
            const match = content.match(/^(.+?)\s+(\S+)$/);
            if (match) {
                return {
                    name: match[1].trim(),
                    code: match[2].trim()
                };
            }
            return {
                name: content,
                code: this.generateDefaultCode(content)
            };
        }

        if (parts.length >= 2) {
            return {
                name: parts[0],
                code: parts[1]
            };
        }

        return null;
    }

    generateDefaultCode(name) {
        const hash = this.simpleHash(name);
        return `ITEM${hash.toString().padStart(6, '0')}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 1000000;
    }

    getSampleData(count = 10) {
        const products = [
            { name: '无线蓝牙耳机 Pro', code: 'BLUETOOTH-001' },
            { name: '智能手表 Series 5', code: 'WATCH-2024-002' },
            { name: '便携式充电宝 20000mAh', code: 'POWERBANK-003' },
            { name: '机械键盘 RGB 背光', code: 'KEYBOARD-MECH-004' },
            { name: '无线鼠标 人体工学', code: 'MOUSE-WIRELESS-005' },
            { name: '4K 高清摄像头', code: 'CAMERA-4K-006' },
            { name: 'USB-C 扩展坞 7合1', code: 'DOCK-USB-C-007' },
            { name: '固态硬盘 NVMe 1TB', code: 'SSD-NVME-1TB-008' },
            { name: '笔记本支架 铝合金', code: 'LAPTOP-STAND-009' },
            { name: '显示器升降支架', code: 'MONITOR-ARM-010' }
        ];

        const sample = [];
        for (let i = 0; i < Math.min(count, products.length); i++) {
            sample.push({
                ...products[i],
                lineNumber: i + 1
            });
        }
        return sample;
    }

    formatSampleData(data) {
        return data.map(item => `${item.name}\t${item.code}`).join('\n');
    }
}

window.ExcelDataParser = ExcelDataParser;
