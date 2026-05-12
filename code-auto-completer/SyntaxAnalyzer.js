class SyntaxAnalyzer {
    constructor() {
        this.editor = null;
        this.onCursorChange = null;
        this.onContentChange = null;
    }

    init(editor, callbacks = {}) {
        this.editor = editor;
        this.onCursorChange = callbacks.onCursorChange || (() => {});
        this.onContentChange = callbacks.onContentChange || (() => {});

        this._setupEventListeners();
    }

    _setupEventListeners() {
        this.editor.onDidChangeCursorPosition((event) => {
            const position = event.position;
            const context = this.analyzeContext(position);
            this.onCursorChange(position, context);
        });

        this.editor.onDidChangeModelContent(() => {
            this.onContentChange(this.editor.getValue());
        });
    }

    analyzeContext(position) {
        const model = this.editor.getModel();
        const value = model.getValue();
        const offset = model.getOffsetAt(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const column = position.column;

        const context = {
            position: position,
            offset: offset,
            lineContent: lineContent,
            textBeforeCursor: lineContent.substring(0, column - 1),
            textAfterCursor: lineContent.substring(column - 1),
            contextType: this._detectContextType(lineContent, column),
            currentWord: this._getCurrentWord(lineContent, column),
            isInString: this._isInString(value, offset),
            isInComment: this._isInComment(value, offset),
            isInFunctionCall: this._isInFunctionCall(lineContent, column),
            functionName: this._getFunctionName(lineContent, column)
        };

        return context;
    }

    _detectContextType(lineContent, column) {
        const textBefore = lineContent.substring(0, column - 1).trim();

        if (textBefore.includes('//') || textBefore.includes('/*')) {
            return 'comment';
        }

        const lastChar = textBefore[textBefore.length - 1];
        const secondLastChar = textBefore.length >= 2 ? textBefore[textBefore.length - 2] : '';

        if (lastChar === '.') {
            return 'property';
        }

        if (lastChar === '(') {
            return 'argument';
        }

        if (lastChar === '=') {
            return 'assignment';
        }

        if (this._startsWithKeyword(textBefore)) {
            return 'statement';
        }

        const wordMatch = textBefore.match(/(\w+)\s*$/);
        if (wordMatch) {
            return 'identifier';
        }

        return 'unknown';
    }

    _startsWithKeyword(text) {
        const keywords = ['var ', 'let ', 'const ', 'function ', 'return ', 'if ', 'else ', 'for ', 'while ', 'switch ', 'case ', 'class ', 'new ', 'throw ', 'try ', 'catch '];
        return keywords.some(keyword => text.endsWith(keyword));
    }

    _getCurrentWord(lineContent, column) {
        const textBefore = lineContent.substring(0, column - 1);
        const wordMatch = textBefore.match(/(\w+)$/);
        return wordMatch ? wordMatch[1] : '';
    }

    _isInString(value, offset) {
        let inString = false;
        let stringType = null;
        let escapeNext = false;

        for (let i = 0; i < offset; i++) {
            const char = value[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (inString) {
                if (char === stringType) {
                    inString = false;
                    stringType = null;
                }
            } else {
                if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringType = char;
                }
            }
        }

        return inString;
    }

    _isInComment(value, offset) {
        const text = value.substring(0, offset);
        
        let inBlockComment = false;
        let inString = false;
        let stringType = null;
        let escapeNext = false;

        for (let i = 0; i < text.length; i++) {
            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            const char = text[i];
            const nextChar = text[i + 1] || '';

            if (!inString) {
                if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    i++;
                    continue;
                }
                
                if (char === '*' && nextChar === '/' && inBlockComment) {
                    inBlockComment = false;
                    i++;
                    continue;
                }
                
                if (char === '/' && nextChar === '/') {
                    const lineEnd = text.indexOf('\n', i);
                    if (lineEnd === -1 || lineEnd > offset - 1) {
                        return true;
                    }
                    i = lineEnd;
                    continue;
                }
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (!inBlockComment) {
                if (inString) {
                    if (char === stringType) {
                        inString = false;
                        stringType = null;
                    }
                } else if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringType = char;
                }
            }
        }

        return inBlockComment;
    }

    _isInFunctionCall(lineContent, column) {
        const textBefore = lineContent.substring(0, column - 1);
        const openParens = (textBefore.match(/\(/g) || []).length;
        const closeParens = (textBefore.match(/\)/g) || []).length;
        return openParens > closeParens;
    }

    _getFunctionName(lineContent, column) {
        const textBefore = lineContent.substring(0, column - 1);
        const match = textBefore.match(/(\w+)\s*\([^)]*$/);
        return match ? match[1] : null;
    }

    getSurroundingCode(position, linesBefore = 3, linesAfter = 1) {
        const model = this.editor.getModel();
        const totalLines = model.getLineCount();
        const startLine = Math.max(1, position.lineNumber - linesBefore);
        const endLine = Math.min(totalLines, position.lineNumber + linesAfter);
        
        return model.getValueInRange({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: model.getLineLength(endLine) + 1
        });
    }
}
