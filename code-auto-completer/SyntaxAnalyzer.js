class SyntaxAnalyzer {
    constructor() {
        this.editor = null;
        this.callbacks = {};
        this.debounceTimer = null;
    }

    init(editor, callbacks = {}) {
        this.editor = editor;
        this.callbacks = callbacks;

        editor.onDidChangeCursorPosition((event) => {
            this.handleCursorChange(event.position);
        });

        editor.onDidChangeModelContent((event) => {
            this.handleContentChange(event);
        });
    }

    handleCursorChange(position) {
        const context = this.analyzeContext(position);
        if (this.callbacks.onCursorChange) {
            this.callbacks.onCursorChange(position, context);
        }
    }

    handleContentChange(event) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            if (this.callbacks.onContentChange) {
                const code = this.editor.getValue();
                this.callbacks.onContentChange(code);
            }
        }, 100);
    }

    analyzeContext(position) {
        const model = this.editor.getModel();
        const lineContent = model.getLineContent(position.lineNumber);
        const prefix = lineContent.substring(0, position.column - 1);
        const word = this.getCurrentWord(prefix);

        const contextType = this.determineContextType(prefix);

        return {
            contextType,
            currentWord: word,
            lineContent,
            prefix,
            position: { ...position }
        };
    }

    getCurrentWord(prefix) {
        const match = prefix.match(/[a-zA-Z0-9_$]+$/);
        return match ? match[0] : '';
    }

    determineContextType(prefix) {
        const trimmed = prefix.trim();

        if (/\b(function|class|const|let|var|if|else|for|while|do|switch|try|catch|return)\s*$/.test(trimmed)) {
            return 'keyword_context';
        }

        if (/\.[a-zA-Z0-9_$]*$/.test(trimmed)) {
            return 'member_access';
        }

        if (/\b(console|document|window|Math|Array|Object|String|Number|Boolean)\.$/.test(trimmed)) {
            return 'builtin_member';
        }

        if (/\bnew\s+[a-zA-Z0-9_$]*$/.test(trimmed)) {
            return 'constructor';
        }

        if (/[a-zA-Z0-9_$]+\s*\($/.test(trimmed)) {
            return 'function_call';
        }

        if (/['"`][^'"`]*$/.test(trimmed)) {
            return 'string';
        }

        if (/\/\/.*$/.test(trimmed)) {
            return 'comment_line';
        }

        if (/\/\*[\s\S]*$/.test(trimmed)) {
            return 'comment_block';
        }

        if (/^[a-zA-Z0-9_$]+$/.test(trimmed)) {
            return 'identifier';
        }

        if (/^\s*[a-zA-Z0-9_$]*$/.test(trimmed)) {
            return 'identifier_at_start';
        }

        return 'unknown';
    }

    getCurrentLine(position) {
        const model = this.editor.getModel();
        return model.getLineContent(position.lineNumber);
    }

    getLineUntilCursor(position) {
        const model = this.editor.getModel();
        const lineContent = model.getLineContent(position.lineNumber);
        return lineContent.substring(0, position.column - 1);
    }

    getPreviousLines(position, count = 5) {
        const model = this.editor.getModel();
        const lines = [];
        const startLine = Math.max(1, position.lineNumber - count);
        
        for (let i = startLine; i < position.lineNumber; i++) {
            lines.push(model.getLineContent(i));
        }
        
        return lines.join('\n');
    }

    extractVariables(code) {
        const variables = new Set();
        const varRegex = /\b(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g;
        let match;
        
        while ((match = varRegex.exec(code)) !== null) {
            variables.add(match[1]);
        }

        const funcRegex = /\bfunction\s+([a-zA-Z0-9_$]+)/g;
        while ((match = funcRegex.exec(code)) !== null) {
            variables.add(match[1]);
        }

        const classRegex = /\bclass\s+([a-zA-Z0-9_$]+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            variables.add(match[1]);
        }

        return Array.from(variables);
    }
}
