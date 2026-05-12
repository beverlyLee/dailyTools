class BrailleLookup {
    constructor() {
        this.numberIndicator = 0b001111;
        this.capitalIndicator = 0b000001;
        
        this.codeToAscii = {
            0b000000: ' ',
            0b000001: 'a',
            0b000011: 'b',
            0b001001: 'c',
            0b011001: 'd',
            0b010001: 'e',
            0b001011: 'f',
            0b011011: 'g',
            0b010011: 'h',
            0b001010: 'i',
            0b011010: 'j',
            0b000101: 'k',
            0b000111: 'l',
            0b001101: 'm',
            0b011101: 'n',
            0b010101: 'o',
            0b001111: 'p',
            0b011111: 'q',
            0b010111: 'r',
            0b001110: 's',
            0b011110: 't',
            0b100101: 'u',
            0b100111: 'v',
            0b111010: 'w',
            0b101101: 'x',
            0b111101: 'y',
            0b110101: 'z',
            0b000010: ',',
            0b000110: ';',
            0b000100: ':',
            0b010100: '.',
            0b100110: '?',
            0b100010: '!',
            0b100001: "'",
            0b001000: '-'
        };
        
        this.codeToNumber = {
            0b000001: '1',
            0b000011: '2',
            0b001001: '3',
            0b011001: '4',
            0b010001: '5',
            0b001011: '6',
            0b011011: '7',
            0b010011: '8',
            0b001010: '9',
            0b011010: '0'
        };
        
        this.validCodes = new Set(Object.keys(this.codeToAscii).map(k => parseInt(k)));
    }

    getUnicodeBraille(code) {
        return String.fromCharCode(0x2800 + code);
    }

    verifyCode(code) {
        if (code === undefined || code === null || isNaN(code)) {
            return { valid: false, code: null };
        }
        const c = parseInt(code);
        if (c < 0 || c > 63) return { valid: false, code: c };
        return {
            valid: this.validCodes.has(c),
            code: c,
            unicode: this.getUnicodeBraille(c),
            ascii: this.codeToAscii[c] || null,
            binary: '0b' + c.toString(2).padStart(6, '0')
        };
    }

    patternToCode(pattern) {
        if (!Array.isArray(pattern) || pattern.length === 0) return 0;
        
        if (pattern[0] && Array.isArray(pattern[0])) {
            let code = 0, idx = 0;
            for (let col = 0; col < 2; col++) {
                for (let row = 0; row < pattern.length; row++) {
                    if (pattern[row] && pattern[row][col]) {
                        code |= (1 << idx);
                    }
                    idx++;
                }
            }
            return code;
        }
        
        let code = 0;
        for (let i = 0; i < pattern.length && i < 6; i++) {
            if (pattern[i]) code |= (1 << i);
        }
        return code;
    }

    lookup(code) {
        const v = this.verifyCode(code);
        if (!v.valid) return null;
        return v.ascii;
    }

    translate(cells, language = 'en') {
        if (!cells || cells.length === 0) return '';
        
        const codes = [];
        for (const cell of cells) {
            let code;
            if (typeof cell === 'number') {
                code = cell;
            } else if (cell.code !== undefined) {
                code = cell.code;
            } else if (Array.isArray(cell)) {
                code = this.patternToCode(cell);
            } else {
                continue;
            }
            
            const v = this.verifyCode(code);
            if (v.valid || code === this.numberIndicator || code === this.capitalIndicator) {
                codes.push(code);
            }
        }

        console.log('[BrailleLookup] 有效编码数:', codes.length);
        console.log('[BrailleLookup] 编码序列:', codes.map(c => 
            this.getUnicodeBraille(c) + ' (0b' + c.toString(2).padStart(6, '0') + ')'
        ).join(' '));

        let result = '';
        let numberMode = false;
        let nextCap = false;

        for (const code of codes) {
            if (code === this.numberIndicator) {
                numberMode = true;
                console.log('[BrailleLookup] 进入数字模式');
                continue;
            }
            
            if (code === this.capitalIndicator) {
                nextCap = true;
                console.log('[BrailleLookup] 下一个字母大写');
                continue;
            }

            if (numberMode) {
                if (this.codeToNumber[code]) {
                    result += this.codeToNumber[code];
                    continue;
                } else if (code === 0) {
                    numberMode = false;
                    result += ' ';
                    continue;
                }
            }

            const ch = this.lookup(code);
            if (ch !== null) {
                if (nextCap && ch.length === 1 && /[a-z]/.test(ch)) {
                    result += ch.toUpperCase();
                    nextCap = false;
                } else {
                    result += ch;
                }
            } else {
                result += this.getUnicodeBraille(code);
            }
        }

        console.log('[BrailleLookup] 最终结果:', result);
        return result;
    }

    dumpMappingTable() {
        console.log('========== Unicode盲文编码表 (U+2800) ==========');
        console.log('编码顺序 (列优先): 列1(点1,2,3) -> 列2(点4,5,6)');
        console.log('');
        
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        for (let i = 0; i < letters.length; i++) {
            const ch = letters[i];
            for (const [code, mapped] of Object.entries(this.codeToAscii)) {
                if (mapped === ch) {
                    const c = parseInt(code);
                    const unicode = this.getUnicodeBraille(c);
                    const binary = c.toString(2).padStart(6, '0');
                    console.log(`'${ch}' -> ${unicode} -> 0b${binary} (${c})`);
                    break;
                }
            }
        }
        console.log('');
        console.log('========== 数字模式 ==========');
        for (const [code, num] of Object.entries(this.codeToNumber)) {
            const c = parseInt(code);
            const unicode = this.getUnicodeBraille(c);
            console.log(`'${num}' -> ${unicode} -> 0b${c.toString(2).padStart(6, '0')}`);
        }
        console.log('');
        console.log('数字指示符 (number indicator): 0b001111 (' + this.getUnicodeBraille(0b001111) + ')');
        console.log('============================================');
    }
}

export { BrailleLookup };
