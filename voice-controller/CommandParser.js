class CommandParser {
    constructor() {
        this.commands = this.initCommands();
    }

    initCommands() {
        return [
            {
                name: 'scrollDown',
                patterns: [/向下滚动/i, /往下滚动/i, /滚动向下/i, /往下滑/i, /向下滑/i],
                handler: () => ({ action: 'scroll', direction: 'down' })
            },
            {
                name: 'scrollUp',
                patterns: [/向上滚动/i, /往上滚动/i, /滚动向上/i, /往上滑/i, /向上滑/i],
                handler: () => ({ action: 'scroll', direction: 'up' })
            },
            {
                name: 'scrollToBottom',
                patterns: [/滚动到底部/i, /滑到底部/i, /到页面底部/i, /底部/i],
                handler: () => ({ action: 'scrollTo', position: 'bottom' })
            },
            {
                name: 'scrollToTop',
                patterns: [/滚动到顶部/i, /滑到顶部/i, /到页面顶部/i, /顶部/i, /回到顶部/i],
                handler: () => ({ action: 'scrollTo', position: 'top' })
            },
            {
                name: 'openMenu',
                patterns: [/打开菜单/i, /展开菜单/i, /显示菜单/i],
                handler: () => ({ action: 'menu', operation: 'open' })
            },
            {
                name: 'closeMenu',
                patterns: [/关闭菜单/i, /收起菜单/i, /隐藏菜单/i],
                handler: () => ({ action: 'menu', operation: 'close' })
            },
            {
                name: 'toggleMenu',
                patterns: [/切换菜单/i],
                handler: () => ({ action: 'menu', operation: 'toggle' })
            },
            {
                name: 'toggleDarkMode',
                patterns: [/切换夜间模式/i, /切换暗黑模式/i, /夜间模式/i, /暗黑模式/i, /深色模式/i, /切换主题/i],
                handler: () => ({ action: 'theme', operation: 'toggle' })
            },
            {
                name: 'clickFirst',
                patterns: [/点击第一个/i, /点第一个/i, /点击按钮一/i, /点按钮一/i],
                handler: () => ({ action: 'click', target: 'first' })
            },
            {
                name: 'clickSecond',
                patterns: [/点击第二个/i, /点第二个/i, /点击按钮二/i, /点按钮二/i],
                handler: () => ({ action: 'click', target: 'second' })
            },
            {
                name: 'clickThird',
                patterns: [/点击第三个/i, /点第三个/i, /点击按钮三/i, /点按钮三/i],
                handler: () => ({ action: 'click', target: 'third' })
            },
            {
                name: 'clickByIndex',
                patterns: [/点击第(\d+)个/i, /点第(\d+)个/i],
                handler: (match) => {
                    const index = parseInt(match[1], 10);
                    return { action: 'click', target: 'index', index };
                }
            }
        ];
    }

    parse(text) {
        if (!text || text.trim().length === 0) {
            return null;
        }

        const trimmedText = text.trim();

        for (const command of this.commands) {
            for (const pattern of command.patterns) {
                const match = trimmedText.match(pattern);
                if (match) {
                    const parsed = command.handler(match);
                    return {
                        name: command.name,
                        text: trimmedText,
                        ...parsed
                    };
                }
            }
        }

        return {
            name: 'unknown',
            text: trimmedText,
            action: 'unknown'
        };
    }

    addCommand(name, patterns, handler) {
        this.commands.push({
            name,
            patterns: patterns.map(p => new RegExp(p, 'i')),
            handler
        });
    }

    removeCommand(name) {
        this.commands = this.commands.filter(cmd => cmd.name !== name);
    }
}

export { CommandParser };