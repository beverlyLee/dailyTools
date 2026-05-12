class ActionExecutor {
    constructor(options = {}) {
        this.demoMenu = options.demoMenu || document.getElementById('demoMenu');
        this.demoButtons = options.demoButtons || document.querySelectorAll('.demo-btn');
        this.scrollAmount = options.scrollAmount || 300;
        this.scrollDuration = options.scrollDuration || 500;
        this.onAction = options.onAction || null;
    }

    execute(parsedCommand) {
        if (!parsedCommand || parsedCommand.action === 'unknown') {
            this.log('无法识别的指令: ' + (parsedCommand?.text || '空'));
            return false;
        }

        switch (parsedCommand.action) {
            case 'scroll':
                return this.scroll(parsedCommand.direction);
            case 'scrollTo':
                return this.scrollTo(parsedCommand.position);
            case 'menu':
                return this.handleMenu(parsedCommand.operation);
            case 'theme':
                return this.handleTheme(parsedCommand.operation);
            case 'click':
                return this.handleClick(parsedCommand);
            default:
                this.log('未知操作类型: ' + parsedCommand.action);
                return false;
        }
    }

    scroll(direction) {
        const amount = direction === 'down' ? this.scrollAmount : -this.scrollAmount;
        
        window.scrollBy({
            top: amount,
            behavior: 'smooth'
        });

        this.log(`滚动页面: ${direction === 'down' ? '向下' : '向上'} ${this.scrollAmount}px`);
        this.notify('scroll', direction);
        return true;
    }

    scrollTo(position) {
        const targetPosition = position === 'bottom' 
            ? document.documentElement.scrollHeight 
            : 0;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        this.log(`滚动到: ${position === 'bottom' ? '底部' : '顶部'}`);
        this.notify('scrollTo', position);
        return true;
    }

    handleMenu(operation) {
        if (!this.demoMenu) {
            this.log('菜单元素未找到');
            return false;
        }

        let result = false;
        const isOpen = this.demoMenu.classList.contains('open');

        switch (operation) {
            case 'open':
                if (!isOpen) {
                    this.demoMenu.classList.add('open');
                    this.log('菜单已打开');
                    result = true;
                } else {
                    this.log('菜单已经打开');
                }
                break;
            case 'close':
                if (isOpen) {
                    this.demoMenu.classList.remove('open');
                    this.log('菜单已关闭');
                    result = true;
                } else {
                    this.log('菜单已经关闭');
                }
                break;
            case 'toggle':
                this.demoMenu.classList.toggle('open');
                this.log(`菜单已${this.demoMenu.classList.contains('open') ? '打开' : '关闭'}`);
                result = true;
                break;
        }

        this.notify('menu', operation);
        return result;
    }

    handleTheme(operation) {
        if (operation !== 'toggle') {
            this.log('不支持的主题操作');
            return false;
        }

        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.log(`已切换到${isDarkMode ? '夜间' : '日间'}模式`);
        this.notify('theme', isDarkMode ? 'dark' : 'light');
        return true;
    }

    handleClick(parsedCommand) {
        let targetIndex = -1;

        switch (parsedCommand.target) {
            case 'first':
                targetIndex = 0;
                break;
            case 'second':
                targetIndex = 1;
                break;
            case 'third':
                targetIndex = 2;
                break;
            case 'index':
                if (parsedCommand.index && parsedCommand.index >= 1) {
                    targetIndex = parsedCommand.index - 1;
                }
                break;
        }

        if (targetIndex < 0 || targetIndex >= this.demoButtons.length) {
            this.log('无效的按钮索引');
            return false;
        }

        const button = this.demoButtons[targetIndex];
        if (!button) {
            this.log('按钮未找到');
            return false;
        }

        button.click();
        button.classList.add('clicked');
        setTimeout(() => {
            button.classList.remove('clicked');
        }, 500);

        this.log(`已点击按钮 ${targetIndex + 1}`);
        this.notify('click', targetIndex + 1);
        return true;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logBox = document.getElementById('logBox');
        
        if (logBox) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `<span class="time">[${timestamp}]</span><span class="action">${message}</span>`;
            logBox.insertBefore(logEntry, logBox.firstChild);
        }
    }

    notify(type, detail) {
        if (this.onAction) {
            this.onAction({ type, detail });
        }
    }

    setScrollAmount(amount) {
        this.scrollAmount = amount;
    }

    setScrollDuration(duration) {
        this.scrollDuration = duration;
    }
}

export { ActionExecutor };