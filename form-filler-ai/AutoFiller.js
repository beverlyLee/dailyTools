class AutoFiller {
    constructor(options = {}) {
        this.options = {
            simulateTyping: options.simulateTyping !== undefined ? options.simulateTyping : false,
            typingDelay: options.typingDelay || 20,
            highlightOnFill: options.highlightOnFill !== undefined ? options.highlightOnFill : true,
            highlightClass: options.highlightClass || 'input-highlight',
            triggerEvents: options.triggerEvents !== undefined ? options.triggerEvents : true,
            skipFilled: options.skipFilled !== undefined ? options.skipFilled : false,
            ...options
        };
    }

    async fillField(match) {
        if (!match || !match.element || match.value === null || match.value === undefined) {
            return false;
        }

        const element = match.element;
        const value = match.value;

        if (this.options.skipFilled && element.value) {
            return false;
        }

        try {
            if (this.options.simulateTyping) {
                await this.simulateTyping(element, value);
            } else {
                this.setValue(element, value);
            }

            if (this.options.triggerEvents) {
                this.triggerInputEvents(element);
            }

            if (this.options.highlightOnFill) {
                this.highlightElement(element);
            }

            return true;
        } catch (error) {
            console.error('Error filling field:', error);
            return false;
        }
    }

    setValue(element, value) {
        const tagName = element.tagName.toLowerCase();
        const type = (element.type || '').toLowerCase();

        if (tagName === 'select') {
            this.setSelectValue(element, value);
        } else if (tagName === 'textarea') {
            element.value = value;
        } else if (type === 'date') {
            element.value = this.formatDate(value);
        } else if (type === 'number') {
            element.value = this.formatNumber(value);
        } else {
            element.value = value;
        }

        if (element.value !== value && type !== 'date' && type !== 'select-one') {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                                   Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
                if (descriptor && descriptor.set) {
                    descriptor.set.call(element, value);
                }
            } catch (e) {
            }
        }
    }

    setSelectValue(selectElement, value) {
        if (selectElement.value === value) {
            return;
        }

        for (const option of selectElement.options) {
            if (option.value === value || option.text === value) {
                selectElement.value = option.value;
                option.selected = true;
                return;
            }

            if (this.normalizeForMatch(option.text) === this.normalizeForMatch(value)) {
                selectElement.value = option.value;
                option.selected = true;
                return;
            }
        }

        if (value === 'male' || value === '女') {
            for (const option of selectElement.options) {
                const text = option.text.toLowerCase();
                if (value === 'male' && (text.includes('男') || text.includes('male'))) {
                    selectElement.value = option.value;
                    option.selected = true;
                    return;
                }
                if (value === 'female' && (text.includes('女') || text.includes('female'))) {
                    selectElement.value = option.value;
                    option.selected = true;
                    return;
                }
            }
        }
    }

    normalizeForMatch(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/\s+/g, '').replace(/[.,-_]/g, '');
    }

    formatDate(value) {
        if (!value) return '';

        const dateStr = String(value);

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const slashMatch = dateStr.match(/(\d{4})[\/年](\d{1,2})[\/月](\d{1,2})/);
        if (slashMatch) {
            const year = slashMatch[1];
            const month = String(slashMatch[2]).padStart(2, '0');
            const day = String(slashMatch[3]).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return dateStr;
    }

    formatNumber(value) {
        if (value === null || value === undefined) return '';
        const num = Number(value);
        return isNaN(num) ? String(value) : String(num);
    }

    async simulateTyping(element, value) {
        element.value = '';
        element.focus();

        const textValue = String(value);
        for (let i = 0; i < textValue.length; i++) {
            element.value += textValue[i];
            this.triggerInputEvents(element);
            
            if (this.options.typingDelay > 0) {
                await this.delay(this.options.typingDelay);
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    triggerInputEvents(element) {
        const events = ['input', 'change', 'focus', 'blur'];
        
        events.forEach(eventName => {
            try {
                const event = new Event(eventName, { bubbles: true, cancelable: true });
                element.dispatchEvent(event);
            } catch (e) {
            }
        });

        try {
            const event = new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' });
            element.dispatchEvent(event);
        } catch (e) {
        }
    }

    highlightElement(element) {
        if (!this.options.highlightClass) return;

        element.classList.add(this.options.highlightClass);

        setTimeout(() => {
            element.classList.remove(this.options.highlightClass);
        }, 800);
    }

    async fillAll(matches) {
        const results = {
            filled: [],
            failed: [],
            skipped: []
        };

        if (!Array.isArray(matches)) {
            return results;
        }

        for (const match of matches) {
            const success = await this.fillField(match);
            if (success) {
                results.filled.push({
                    entity: match.entity,
                    value: match.value,
                    element: match.element
                });
            } else if (this.options.skipFilled && match.element.value) {
                results.skipped.push({
                    entity: match.entity,
                    reason: 'Field already has value'
                });
            } else {
                results.failed.push({
                    entity: match.entity,
                    reason: 'Failed to fill'
                });
            }
        }

        return results;
    }

    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
}
