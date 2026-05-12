class SymbolDetector {
    constructor() {
        this.symbolTemplates = this.createSymbolTemplates();
        this.symbolFeatures = this.createSymbolFeatures();
    }

    createSymbolTemplates() {
        return {
            '0': this.createDigit0(),
            '1': this.createDigit1(),
            '2': this.createDigit2(),
            '3': this.createDigit3(),
            '4': this.createDigit4(),
            '5': this.createDigit5(),
            '6': this.createDigit6(),
            '7': this.createDigit7(),
            '8': this.createDigit8(),
            '9': this.createDigit9(),
            '+': this.createPlus(),
            '-': this.createMinus(),
            '=': this.createEqual(),
            'x': this.createX(),
            'y': this.createY(),
            'n': this.createN(),
            'k': this.createK(),
            'e': this.createE(),
            'd': this.createD(),
            'i': this.createI(),
            'f': this.createF(),
            'g': this.createG(),
            'h': this.createH(),
            'a': this.createA(),
            'b': this.createB(),
            'c': this.createC(),
            'l': this.createL(),
            'm': this.createM(),
            'o': this.createO(),
            'p': this.createP(),
            'q': this.createQ(),
            'r': this.createR(),
            's': this.createS(),
            't': this.createT(),
            'u': this.createU(),
            'v': this.createV(),
            'w': this.createW(),
            'z': this.createZ(),
            ',': this.createComma(),
            ';': this.createSemicolon(),
            ':': this.createColon(),
            '!': this.createExclamation(),
            '(': this.createLeftParen(),
            ')': this.createRightParen(),
            '[': this.createLeftBracket(),
            ']': this.createRightBracket(),
            '{': this.createLeftBrace(),
            '}': this.createRightBrace(),
            '<': this.createLessThan(),
            '>': this.createGreaterThan(),
            '.': this.createDot(),
        };
    }

    createSymbolFeatures() {
        return {
            '0': { aspectRatio: 1.0, fillRatio: 0.5, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'digit' },
            '1': { aspectRatio: 0.4, fillRatio: 0.3, horizontalSymmetry: 0.5, verticalSymmetry: 0.9, category: 'digit' },
            '2': { aspectRatio: 0.6, fillRatio: 0.35, horizontalSymmetry: 0.4, verticalSymmetry: 0.7, category: 'digit' },
            '3': { aspectRatio: 0.6, fillRatio: 0.4, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'digit' },
            '4': { aspectRatio: 0.6, fillRatio: 0.35, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'digit' },
            '5': { aspectRatio: 0.6, fillRatio: 0.4, horizontalSymmetry: 0.7, verticalSymmetry: 0.5, category: 'digit' },
            '6': { aspectRatio: 1.0, fillRatio: 0.45, horizontalSymmetry: 0.7, verticalSymmetry: 0.5, category: 'digit' },
            '7': { aspectRatio: 0.6, fillRatio: 0.25, horizontalSymmetry: 0.7, verticalSymmetry: 0.3, category: 'digit' },
            '8': { aspectRatio: 1.0, fillRatio: 0.55, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'digit' },
            '9': { aspectRatio: 1.0, fillRatio: 0.45, horizontalSymmetry: 0.7, verticalSymmetry: 0.5, category: 'digit' },
            '+': { aspectRatio: 1.0, fillRatio: 0.4, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'operator', crossRatio: 1.0 },
            '-': { aspectRatio: 0.2, fillRatio: 0.4, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'operator' },
            '=': { aspectRatio: 0.4, fillRatio: 0.3, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'operator', hasTwoLines: true },
            'x': { aspectRatio: 1.0, fillRatio: 0.35, horizontalSymmetry: 0.9, verticalSymmetry: 0.9, category: 'variable', diagonalRatio: 1.0 },
            'y': { aspectRatio: 1.3, fillRatio: 0.25, horizontalSymmetry: 0.7, verticalSymmetry: 0.5, category: 'variable' },
            'n': { aspectRatio: 1.0, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.9, category: 'variable' },
            'k': { aspectRatio: 1.2, fillRatio: 0.3, horizontalSymmetry: 0.5, verticalSymmetry: 0.9, category: 'variable' },
            'e': { aspectRatio: 0.9, fillRatio: 0.45, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'variable' },
            'd': { aspectRatio: 1.1, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'i': { aspectRatio: 1.8, fillRatio: 0.2, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'variable' },
            'f': { aspectRatio: 1.5, fillRatio: 0.25, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'g': { aspectRatio: 1.3, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'h': { aspectRatio: 1.5, fillRatio: 0.35, horizontalSymmetry: 0.5, verticalSymmetry: 0.9, category: 'variable' },
            'a': { aspectRatio: 0.9, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.7, category: 'variable' },
            'b': { aspectRatio: 1.3, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'c': { aspectRatio: 0.9, fillRatio: 0.35, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'variable' },
            'l': { aspectRatio: 2.5, fillRatio: 0.15, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'variable' },
            'm': { aspectRatio: 0.8, fillRatio: 0.45, horizontalSymmetry: 0.5, verticalSymmetry: 0.9, category: 'variable' },
            'o': { aspectRatio: 1.0, fillRatio: 0.5, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'variable' },
            'p': { aspectRatio: 1.3, fillRatio: 0.35, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'q': { aspectRatio: 1.3, fillRatio: 0.4, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            'r': { aspectRatio: 1.2, fillRatio: 0.25, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'variable' },
            's': { aspectRatio: 0.9, fillRatio: 0.4, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'variable' },
            't': { aspectRatio: 1.3, fillRatio: 0.25, horizontalSymmetry: 0.95, verticalSymmetry: 0.7, category: 'variable' },
            'u': { aspectRatio: 1.0, fillRatio: 0.35, horizontalSymmetry: 0.95, verticalSymmetry: 0.9, category: 'variable' },
            'v': { aspectRatio: 0.9, fillRatio: 0.3, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'variable' },
            'w': { aspectRatio: 0.7, fillRatio: 0.4, horizontalSymmetry: 0.95, verticalSymmetry: 0.9, category: 'variable' },
            'z': { aspectRatio: 0.7, fillRatio: 0.35, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'variable' },
            ',': { aspectRatio: 0.6, fillRatio: 0.15, horizontalSymmetry: 0.3, verticalSymmetry: 0.3, category: 'punctuation', position: 'bottom' },
            ';': { aspectRatio: 0.5, fillRatio: 0.2, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, category: 'punctuation', hasTwoDots: true },
            ':': { aspectRatio: 0.5, fillRatio: 0.2, horizontalSymmetry: 0.95, verticalSymmetry: 0.5, category: 'punctuation', hasTwoDots: true, centered: true },
            '!': { aspectRatio: 0.3, fillRatio: 0.25, horizontalSymmetry: 0.95, verticalSymmetry: 0.3, category: 'punctuation' },
            '(': { aspectRatio: 0.4, fillRatio: 0.3, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'delimiter', curveLeft: true },
            ')': { aspectRatio: 0.4, fillRatio: 0.3, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'delimiter', curveRight: true },
            '[': { aspectRatio: 0.3, fillRatio: 0.35, horizontalSymmetry: 0.3, verticalSymmetry: 0.95, category: 'delimiter', straightLeft: true },
            ']': { aspectRatio: 0.3, fillRatio: 0.35, horizontalSymmetry: 0.3, verticalSymmetry: 0.95, category: 'delimiter', straightRight: true },
            '{': { aspectRatio: 0.5, fillRatio: 0.25, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'delimiter', curlyLeft: true },
            '}': { aspectRatio: 0.5, fillRatio: 0.25, horizontalSymmetry: 0.5, verticalSymmetry: 0.95, category: 'delimiter', curlyRight: true },
            '<': { aspectRatio: 0.8, fillRatio: 0.25, horizontalSymmetry: 0.3, verticalSymmetry: 0.95, category: 'operator', pointsRight: true },
            '>': { aspectRatio: 0.8, fillRatio: 0.25, horizontalSymmetry: 0.3, verticalSymmetry: 0.95, category: 'operator', pointsLeft: true },
            '.': { aspectRatio: 1.0, fillRatio: 0.3, horizontalSymmetry: 0.95, verticalSymmetry: 0.95, category: 'punctuation', small: true },
        };
    }

    createDigit0() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                const dx = (x - 6.5) / 6.5;
                const dy = (y - 7.5) / 7.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                template.push(dist < 0.85 && dist > 0.6 ? 1 : 0);
            }
        }
        return template;
    }

    createDigit1() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 8; x++) {
                if (y >= 2 && y <= 14 && x >= 3 && x <= 5) {
                    template.push(1);
                } else if (y <= 2 && x >= 2 && x <= 6) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createDigit2() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 12; x++) {
                if (y <= 3 && x >= 2 && x <= 9) template.push(1);
                else if (y <= 7 && x >= 8) template.push(1);
                else if (y <= 7 && y >= 4 && x >= 7 && x <= 9) template.push(1);
                else if (y >= 4 && y <= 8 && x >= 3 && x <= 7) template.push(1);
                else if (y >= 8 && y <= 11 && x >= 3 && x <= 5) template.push(1);
                else if (y >= 11 && x >= 2 && x <= 9) template.push(1);
                else if (y >= 7 && x <= 4) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit3() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 12; x++) {
                if (y <= 3 && x >= 2 && x <= 9) template.push(1);
                else if (y <= 7 && x >= 8) template.push(1);
                else if (y >= 5 && y <= 8 && x >= 4 && x <= 7) template.push(1);
                else if (y >= 8 && y <= 11 && x >= 8) template.push(1);
                else if (y >= 11 && x >= 2 && x <= 9) template.push(1);
                else if (y <= 4 && x <= 4) template.push(1);
                else if (y >= 8 && y <= 11 && x <= 4) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit4() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 12; x++) {
                if (x >= 2 && x <= 4 && y >= 2 && y <= 7) template.push(1);
                else if (x >= 6 && x <= 9) template.push(1);
                else if (y >= 6 && y <= 8 && x >= 2 && x <= 9) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit5() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 12; x++) {
                if (y <= 3 && x >= 2 && x <= 9) template.push(1);
                else if (y <= 3 && x >= 2 && x <= 4) template.push(1);
                else if (y >= 3 && y <= 6 && x >= 2 && x <= 4) template.push(1);
                else if (y >= 5 && y <= 7 && x >= 2 && x <= 7) template.push(1);
                else if (y >= 7 && y <= 10 && x >= 8) template.push(1);
                else if (y >= 10 && x >= 2 && x <= 9) template.push(1);
                else if (y >= 10 && x <= 4) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit6() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 4 && x >= 2 && x <= 4) template.push(1);
                else if (y >= 2 && y <= 4 && x >= 2 && x <= 9) template.push(1);
                else if (y >= 4 && x >= 2 && x <= 4) template.push(1);
                else if (y >= 4 && y <= 7 && x >= 2 && x <= 10) template.push(1);
                else if (y >= 7 && y <= 12 && (x <= 4 || x >= 9)) template.push(1);
                else if (y >= 11 && x >= 4 && x <= 9) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit7() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 12; x++) {
                if (y <= 3 && x >= 2 && x <= 9) template.push(1);
                else if (y >= 3 && x >= 7) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit8() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 12 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 6 && y <= 9 && x >= 3 && x <= 10) template.push(1);
                else if (x <= 3 || x >= 10) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createDigit9() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 4 && x >= 2 && x <= 11) template.push(1);
                else if (y <= 8 && (x <= 3 || x >= 10)) template.push(1);
                else if (y >= 4 && y <= 8 && x >= 4 && x <= 10) template.push(1);
                else if (y >= 8 && x >= 9) template.push(1);
                else if (y >= 10 && x >= 2 && x <= 11) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createPlus() {
        const template = [];
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 12; x++) {
                if ((y >= 4 && y <= 7) || (x >= 4 && x <= 7)) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createMinus() {
        const template = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 16; x++) {
                if (y >= 3 && y <= 4 && x >= 2 && x <= 13) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createEqual() {
        const template = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 16; x++) {
                if ((y >= 2 && y <= 3 && x >= 2 && x <= 13) ||
                    (y >= 6 && y <= 7 && x >= 2 && x <= 13)) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createX() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 14; x++) {
                if (Math.abs(x - y) <= 1 || Math.abs(x + y - 13) <= 1) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createY() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 6 && (Math.abs(x - y) <= 1 || Math.abs(x + y - 12) <= 1)) {
                    template.push(1);
                } else if (y >= 6 && x >= 5 && x <= 7) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createN() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 14; x++) {
                if (x >= 2 && x <= 4) template.push(1);
                else if (x >= 9 && x <= 11) template.push(1);
                else if (x >= 4 && x <= 9 && Math.abs(x - y) <= 1) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createK() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x >= 2 && x <= 4) template.push(1);
                else if (y <= 8 && x >= 6 && Math.abs((x - 6) - (8 - y)) <= 1) template.push(1);
                else if (y >= 8 && x >= 6 && Math.abs((x - 6) - (y - 8)) <= 1) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createE() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if ((y <= 3 || y >= 12 || (y >= 7 && y <= 9)) && x <= 11) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createD() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if ((y <= 2 || y >= 13) && x <= 10) template.push(1);
                else if (x >= 9 && x <= 10) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createI() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 6; x++) {
                if (y <= 2 && x >= 0 && x <= 5) template.push(1);
                else if (y >= 13 && x >= 0 && x <= 5) template.push(1);
                else if (x >= 2 && x <= 3) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createF() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if (y <= 3 && x <= 11) template.push(1);
                else if (y >= 7 && y <= 9 && x <= 10) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createG() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 12 && x >= 2 && x <= 11) template.push(1);
                else if (x <= 3) template.push(1);
                else if (x >= 10 && y >= 8) template.push(1);
                else if (y >= 8 && y <= 10 && x >= 7 && x <= 10) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createH() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4 || x >= 10) template.push(1);
                else if (y >= 7 && y <= 9 && x >= 2 && x <= 11) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createA() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 6 && Math.abs(x - 7) <= Math.floor(6 - y)) template.push(1);
                else if (y >= 6 && x >= 3 && x <= 5) template.push(1);
                else if (y >= 6 && x >= 9 && x <= 11) template.push(1);
                else if (y >= 5 && y <= 8 && x >= 5 && x <= 9) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createB() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if ((y <= 2 || y >= 6 && y <= 9 || y >= 13) && x <= 10) template.push(1);
                else if (x >= 9) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createC() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 12 && x >= 2 && x <= 11) template.push(1);
                else if (x <= 3) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createL() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if (y >= 12 && x <= 11) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createM() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 18; x++) {
                if (x >= 2 && x <= 4) template.push(1);
                else if (x >= 13 && x <= 15) template.push(1);
                else if (x >= 7 && x <= 10 && x <= 10 - y) template.push(1);
                else if (x >= 7 && x <= 10 && x >= 7 + y && y <= 5) template.push(1);
                else if (x >= 4 && x <= 7 && Math.abs((x - 4) - (7 - y)) <= 1 && y <= 7) template.push(1);
                else if (x >= 10 && x <= 13 && Math.abs((x - 13) - (y - 7)) <= 1 && y <= 7) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createO() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                const dx = (x - 6.5) / 6.5;
                const dy = (y - 7.5) / 7.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                template.push(dist < 0.85 && dist > 0.55 ? 1 : 0);
            }
        }
        return template;
    }

    createP() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if ((y <= 2 || y >= 6 && y <= 8) && x <= 10) template.push(1);
                else if (x >= 9 && y <= 9) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createQ() {
        const template = [];
        for (let y = 0; y < 18; y++) {
            for (let x = 0; x < 16; x++) {
                const dx = (x - 7.5) / 6.5;
                const dy = (y - 8.5) / 7.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (y <= 15 && dist < 0.85 && dist > 0.55) template.push(1);
                else if (y >= 13 && x >= 10 && x <= 14) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createR() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4) template.push(1);
                else if ((y <= 2 || y >= 6 && y <= 8) && x <= 10) template.push(1);
                else if (x >= 9 && y <= 9) template.push(1);
                else if (y >= 7 && x >= 8 && Math.abs((x - 8) - (y - 7)) <= 1) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createS() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 12 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 6 && y <= 9 && x >= 3 && x <= 10) template.push(1);
                else if (x <= 3 && y <= 8) template.push(1);
                else if (x >= 10 && y >= 7) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createT() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (x >= 5 && x <= 8) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createU() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 14; x++) {
                if (x <= 4 || x >= 10) template.push(1);
                else if (y >= 12 && x >= 2 && x <= 11) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createV() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                if (y <= 12 && (Math.abs(x - 4 - y) <= 1 || Math.abs(x - 11 + y) <= 1)) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createW() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 20; x++) {
                if (y <= 12 && Math.abs(x - 4 - y) <= 1) template.push(1);
                else if (y <= 12 && Math.abs(x - 9 + y) <= 1) template.push(1);
                else if (y <= 12 && Math.abs(x - 10 - y) <= 1) template.push(1);
                else if (y <= 12 && Math.abs(x - 15 + y) <= 1) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createZ() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 14; x++) {
                if (y <= 3 && x >= 2 && x <= 11) template.push(1);
                else if (y >= 10 && x >= 2 && x <= 11) template.push(1);
                else if (Math.abs(x + y - 12) <= 1) template.push(1);
                else template.push(0);
            }
        }
        return template;
    }

    createComma() {
        const template = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 6; x++) {
                if (y >= 4 && y <= 6 && x >= 2 && x <= 4) {
                    template.push(1);
                } else if (y >= 6 && x >= 3) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createSemicolon() {
        const template = [];
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 6; x++) {
                if (y <= 2 && x >= 2 && x <= 4) {
                    template.push(1);
                } else if (y >= 6 && y <= 8 && x >= 2 && x <= 4) {
                    template.push(1);
                } else if (y >= 8 && x >= 3) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createColon() {
        const template = [];
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 6; x++) {
                if ((y <= 2 && x >= 2 && x <= 4) || (y >= 6 && y <= 8 && x >= 2 && x <= 4)) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createExclamation() {
        const template = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 6; x++) {
                if (y <= 10 && x >= 2 && x <= 4) {
                    template.push(1);
                } else if (y >= 13 && x >= 2 && x <= 4) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createLeftParen() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 8; x++) {
                const dx = (x - 6) / 6;
                const dy = (y - 10) / 10;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.05 && dist > 0.85 && x <= 4) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createRightParen() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 8; x++) {
                const dx = (x - 2) / 6;
                const dy = (y - 10) / 10;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.05 && dist > 0.85 && x >= 4) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createLeftBracket() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 6; x++) {
                if (x <= 2) {
                    template.push(1);
                } else if ((y <= 2 || y >= 17) && x <= 5) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createRightBracket() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 6; x++) {
                if (x >= 4) {
                    template.push(1);
                } else if ((y <= 2 || y >= 17) && x >= 1) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createLeftBrace() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 8; x++) {
                if (x <= 1) {
                    template.push(1);
                } else if (y === 9 && x <= 5) {
                    template.push(1);
                } else if ((y <= 2 || y >= 17) && x <= 6) {
                    template.push(1);
                } else if ((y === 3 || y === 4) && x <= 4) {
                    template.push(1);
                } else if ((y === 15 || y === 16) && x <= 4) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createRightBrace() {
        const template = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 8; x++) {
                if (x >= 7) {
                    template.push(1);
                } else if (y === 9 && x >= 3) {
                    template.push(1);
                } else if ((y <= 2 || y >= 17) && x >= 2) {
                    template.push(1);
                } else if ((y === 3 || y === 4) && x >= 4) {
                    template.push(1);
                } else if ((y === 15 || y === 16) && x >= 4) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createLessThan() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 12; x++) {
                if (Math.abs(x - y + 6) <= 1 || Math.abs(x + y - 6) <= 1) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createGreaterThan() {
        const template = [];
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 12; x++) {
                if (Math.abs(x - y - 6) <= 1 || Math.abs(x + y - 6) <= 1) {
                    template.push(1);
                } else {
                    template.push(0);
                }
            }
        }
        return template;
    }

    createDot() {
        const template = [];
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                const dx = x - 2.5;
                const dy = y - 2.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                template.push(dist < 1.5 ? 1 : 0);
            }
        }
        return template;
    }

    extractFeatures(component, binaryData, width, height) {
        const { minX, minY, maxX, maxY } = component;
        const compWidth = maxX - minX + 1;
        const compHeight = maxY - minY + 1;
        
        if (compWidth < 2 || compHeight < 2) {
            return null;
        }
        
        let totalPixels = 0;
        let filledPixels = 0;
        
        let topHalfFilled = 0, bottomHalfFilled = 0;
        let leftHalfFilled = 0, rightHalfFilled = 0;
        
        const centerY = (minY + maxY) / 2;
        const centerX = (minX + maxX) / 2;
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const isDark = binaryData[y * width + x];
                
                totalPixels++;
                if (isDark) {
                    filledPixels++;
                    
                    if (y <= centerY) topHalfFilled++;
                    else bottomHalfFilled++;
                    
                    if (x <= centerX) leftHalfFilled++;
                    else rightHalfFilled++;
                }
            }
        }
        
        const aspectRatio = compWidth / Math.max(compHeight, 1);
        const fillRatio = filledPixels / Math.max(totalPixels, 1);
        
        const horizontalSymmetry = 1 - Math.abs(topHalfFilled - bottomHalfFilled) / Math.max(filledPixels, 1);
        const verticalSymmetry = 1 - Math.abs(leftHalfFilled - rightHalfFilled) / Math.max(filledPixels, 1);
        
        const projectionH = new Array(compHeight).fill(0);
        const projectionV = new Array(compWidth).fill(0);
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (binaryData[y * width + x]) {
                    projectionH[y - minY]++;
                    projectionV[x - minX]++;
                }
            }
        }
        
        const hPeaks = this.countPeaks(projectionH);
        const vPeaks = this.countPeaks(projectionV);
        
        let hasTwoLines = false;
        if (fillRatio < 0.4 && aspectRatio > 0.3 && aspectRatio < 0.6) {
            const gaps = this.countGaps(projectionH, 0.1);
            hasTwoLines = gaps >= 1 && gaps <= 2;
        }
        
        const normalizedTemplate = this.normalizeToTemplate(component, binaryData, width, height, 16, 16);
        
        const relativeX = component.centerX / width;
        const relativeY = component.centerY / height;
        
        let category = 'unknown';
        if (aspectRatio < 0.25 && fillRatio > 0.3) {
            category = 'operator';
        } else if (aspectRatio > 0.8 && aspectRatio < 1.2 && fillRatio > 0.4) {
            category = 'digit_or_variable';
        } else if (aspectRatio < 0.6 && fillRatio < 0.4) {
            category = 'punctuation';
        }
        
        return {
            aspectRatio,
            fillRatio,
            horizontalSymmetry,
            verticalSymmetry,
            hPeaks,
            vPeaks,
            hasTwoLines,
            compWidth,
            compHeight,
            centerX: component.centerX,
            centerY: component.centerY,
            relativeX,
            relativeY,
            normalizedTemplate,
            rawComponent: component,
            category,
            pixelCount: filledPixels
        };
    }

    countPeaks(array) {
        let peaks = 0;
        for (let i = 1; i < array.length - 1; i++) {
            if (array[i] > array[i - 1] && array[i] > array[i + 1]) {
                peaks++;
            }
        }
        return peaks;
    }

    countGaps(array, thresholdRatio) {
        const threshold = Math.max(...array) * thresholdRatio;
        let gaps = 0;
        let inGap = false;
        
        for (let i = 0; i < array.length; i++) {
            if (array[i] < threshold) {
                if (!inGap) {
                    inGap = true;
                    gaps++;
                }
            } else {
                inGap = false;
            }
        }
        
        return gaps;
    }

    normalizeToTemplate(component, binaryData, width, height, targetW, targetH) {
        const { minX, minY, maxX, maxY } = component;
        const compW = maxX - minX + 1;
        const compH = maxY - minY + 1;
        
        const template = new Array(targetW * targetH).fill(0);
        
        for (let ty = 0; ty < targetH; ty++) {
            for (let tx = 0; tx < targetW; tx++) {
                const srcX = minX + Math.floor((tx / targetW) * compW);
                const srcY = minY + Math.floor((ty / targetH) * compH);
                const clampedX = Math.min(Math.max(srcX, minX), maxX);
                const clampedY = Math.min(Math.max(srcY, minY), maxY);
                
                if (binaryData[clampedY * width + clampedX]) {
                    template[ty * targetW + tx] = 1;
                }
            }
        }
        
        return template;
    }

    matchSymbol(features) {
        if (!features) return { symbol: '[UNK]', confidence: 0 };
        
        let bestMatch = { symbol: '[UNK]', confidence: 0 };
        let bestScore = -Infinity;
        
        const topMatches = [];
        
        for (const [symbol, expected] of Object.entries(this.symbolFeatures)) {
            const score = this.calculateSimilarity(features, expected);
            topMatches.push({ symbol, score, expected });
        }
        
        topMatches.sort((a, b) => b.score - a.score);
        
        if (topMatches.length > 0) {
            bestMatch = { symbol: topMatches[0].symbol, confidence: topMatches[0].score };
            
            if (features.aspectRatio < 0.25 && features.fillRatio > 0.3) {
                bestMatch = { symbol: '-', confidence: Math.max(bestMatch.confidence, 0.7) };
            }
            if (features.hasTwoLines && features.aspectRatio > 0.3 && features.aspectRatio < 0.5) {
                bestMatch = { symbol: '=', confidence: 0.85 };
            }
            if (features.aspectRatio > 0.8 && features.aspectRatio < 1.2 && 
                features.horizontalSymmetry > 0.85 && features.verticalSymmetry > 0.85) {
                if (features.fillRatio > 0.35 && features.fillRatio < 0.45) {
                    bestMatch = { symbol: '+', confidence: 0.8 };
                }
            }
            
            if (features.aspectRatio < 0.6 && features.compHeight > 10) {
                if (features.relativeY > 0.7 && features.fillRatio < 0.3) {
                    if (topMatches[0].symbol === ',' || topMatches[1]?.symbol === ',') {
                        bestMatch = { symbol: ',', confidence: 0.75 };
                    }
                }
            }
        }
        
        return bestMatch;
    }

    calculateSimilarity(features, expected) {
        let score = 0;
        let weight = 0;
        
        const arDiff = Math.abs(features.aspectRatio - expected.aspectRatio);
        score += Math.max(0, 1 - arDiff * 2) * 0.25;
        weight += 0.25;
        
        const frDiff = Math.abs(features.fillRatio - expected.fillRatio);
        score += Math.max(0, 1 - frDiff * 3) * 0.2;
        weight += 0.2;
        
        if (features.horizontalSymmetry > 0.7 && expected.horizontalSymmetry > 0.7) {
            score += 0.15;
            weight += 0.15;
        } else if (features.horizontalSymmetry < 0.6 && expected.horizontalSymmetry < 0.6) {
            score += 0.1;
            weight += 0.15;
        }
        
        if (features.verticalSymmetry > 0.7 && expected.verticalSymmetry > 0.7) {
            score += 0.15;
            weight += 0.15;
        } else if (features.verticalSymmetry < 0.6 && expected.verticalSymmetry < 0.6) {
            score += 0.1;
            weight += 0.15;
        }
        
        if (expected.hasTwoLines !== undefined) {
            if (features.hasTwoLines === expected.hasTwoLines) {
                score += 0.25;
                weight += 0.25;
            }
        }
        
        if (expected.category && features.category) {
            if (expected.category === features.category) {
                score += 0.1;
                weight += 0.1;
            }
        }
        
        return weight > 0 ? score / weight : 0;
    }

    detectSymbols(sourceCanvas, components) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const binaryData = [];
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            binaryData.push(brightness < 128);
        }
        
        const detectedSymbols = [];
        
        for (const component of components) {
            if (component.width < 3 || component.height < 3) continue;
            if (component.pixelCount < 5) continue;
            
            const features = this.extractFeatures(component, binaryData, width, height);
            if (!features) continue;
            
            const match = this.matchSymbol(features);
            
            detectedSymbols.push({
                ...component,
                ...features,
                symbol: match.symbol,
                confidence: match.confidence,
                rawComponent: component
            });
        }
        
        return detectedSymbols.sort((a, b) => a.minX - b.minX);
    }
}

export { SymbolDetector };
