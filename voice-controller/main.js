import { SpeechRecognizer } from './SpeechRecognizer.js';
import { CommandParser } from './CommandParser.js';
import { ActionExecutor } from './ActionExecutor.js';

class VoiceControllerApp {
    constructor() {
        this.recognizer = null;
        this.parser = null;
        this.executor = null;
        this.transcriptText = '';
        this.networkCheckInterval = null;
        this.hasReceivedResult = false;
        
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            transcriptBox: document.getElementById('transcriptBox'),
            commandBox: document.getElementById('commandBox'),
            browserIcon: document.getElementById('browserIcon'),
            httpsIcon: document.getElementById('httpsIcon'),
            networkIcon: document.getElementById('networkIcon'),
            audioLevelPanel: document.getElementById('audioLevelPanel'),
            audioLevelBar: document.getElementById('audioLevelBar'),
            audioLevelText: document.getElementById('audioLevelText')
        };

        this.init();
    }

    async init() {
        try {
            this.log('正在检查运行环境...');
            
            await this.performEnvironmentChecks();
            
            this.parser = new CommandParser();
            this.executor = new ActionExecutor();
            this.recognizer = new SpeechRecognizer({
                language: 'zh-CN',
                recognitionTimeout: 15000,
                silenceTimeout: 8000,
                onStart: this.handleStart.bind(this),
                onEnd: this.handleEnd.bind(this),
                onError: this.handleError.bind(this),
                onResult: this.handleResult.bind(this),
                onTimeout: this.handleTimeout.bind(this),
                onAudioLevel: this.handleAudioLevel.bind(this),
                onDebug: this.handleDebug.bind(this)
            });

            await this.recognizer.init();

            this.bindEvents();
            this.startNetworkMonitoring();
            this.log('✅ 语音控制器初始化成功！点击"开始语音识别"按钮开始使用');
            
        } catch (error) {
            this.log('❌ 初始化失败: ' + error.message);
            this.elements.statusText.textContent = '初始化失败';
            this.elements.startBtn.disabled = true;
            this.showErrorHint(error.message);
        }
    }

    async performEnvironmentChecks() {
        const checks = [
            {
                name: '浏览器支持',
                result: SpeechRecognizer.checkBrowserSupport(),
                icon: this.elements.browserIcon,
                message: '您的浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器'
            },
            {
                name: 'HTTPS 环境',
                result: SpeechRecognizer.checkHTTPS(),
                icon: this.elements.httpsIcon,
                message: '需要 HTTPS 或 localhost 环境才能使用语音识别功能'
            },
            {
                name: '麦克风支持',
                result: SpeechRecognizer.checkMicrophoneSupport(),
                icon: null,
                message: '您的浏览器不支持麦克风 API'
            }
        ];
        
        const hasNetwork = await SpeechRecognizer.checkNetwork();
        checks.push({
            name: '网络连接',
            result: hasNetwork,
            icon: this.elements.networkIcon,
            message: '无法连接到网络，语音识别需要网络连接（Google 语音服务）'
        });
        
        for (const check of checks) {
            if (check.result) {
                this.updateEnvIcon(check.icon, 'ok');
                this.log(`✅ ${check.name}: 正常`);
            } else {
                this.updateEnvIcon(check.icon, 'error');
                this.log(`❌ ${check.name}: 失败`);
                throw new Error(check.message);
            }
        }
        
        return true;
    }

    updateEnvIcon(element, status) {
        if (!element) return;
        
        switch (status) {
            case 'ok':
                element.textContent = '✅';
                element.style.color = 'var(--success-color)';
                break;
            case 'error':
                element.textContent = '❌';
                element.style.color = 'var(--danger-color)';
                break;
            case 'warning':
                element.textContent = '⚠️';
                element.style.color = 'var(--listening-color)';
                break;
            default:
                element.textContent = '⏳';
                element.style.color = 'var(--text-secondary)';
        }
    }

    startNetworkMonitoring() {
        this.networkCheckInterval = setInterval(async () => {
            const hasNetwork = await SpeechRecognizer.checkNetwork();
            
            if (hasNetwork) {
                this.updateEnvIcon(this.elements.networkIcon, 'ok');
            } else {
                this.updateEnvIcon(this.elements.networkIcon, 'warning');
                if (this.recognizer && this.recognizer.isListening) {
                    this.log('⚠️ 检测到网络断开，语音识别可能无法正常工作');
                    this.elements.statusText.textContent = '网络不稳定';
                }
            }
        }, 30000);
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', async () => {
            try {
                this.log('正在请求麦克风权限...');
                
                const hasNetwork = await SpeechRecognizer.checkNetwork();
                if (!hasNetwork) {
                    throw new Error('无法连接到网络，请检查网络连接后重试（Google 语音服务需要联网）');
                }
                
                this.hasReceivedResult = false;
                this.elements.transcriptBox.textContent = '等待语音输入...';
                this.elements.commandBox.textContent = '暂无指令';
                
                await this.recognizer.start();
                
            } catch (error) {
                this.log('❌ 启动失败: ' + error.message);
                this.showErrorHint(error.message);
            }
        });

        this.elements.stopBtn.addEventListener('click', () => {
            try {
                this.recognizer.stop();
            } catch (error) {
                this.log('❌ 停止失败: ' + error.message);
            }
        });
    }

    handleStart() {
        this.elements.statusIndicator.classList.add('listening');
        this.elements.statusText.textContent = '🎤 正在监听...';
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.transcriptText = '';
        this.hasReceivedResult = false;
        
        this.elements.audioLevelPanel.style.display = 'flex';
        this.updateAudioLevel(0);
        
        this.log('✅ 语音识别已开始，请对着麦克风说话');
        this.log('💡 提示：如果长时间没有反应，请检查麦克风是否正常工作');
    }

    handleEnd() {
        this.elements.statusIndicator.classList.remove('listening');
        this.elements.statusText.textContent = '准备就绪';
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        
        this.elements.audioLevelPanel.style.display = 'none';
        this.updateAudioLevel(0);
        
        this.log('语音识别已停止');
        
        if (!this.hasReceivedResult) {
            this.log('⚠️ 本次会话未检测到任何语音输入');
        }
    }

    handleError(error) {
        let errorMessage = '';
        let shouldDisable = false;
        
        switch (error) {
            case 'not-allowed':
                errorMessage = '❌ 麦克风权限被拒绝！请在浏览器设置中允许麦克风访问权限';
                shouldDisable = true;
                break;
            case 'no-speech':
                errorMessage = '未检测到语音，请对着麦克风说话';
                break;
            case 'audio-capture':
                errorMessage = '❌ 无法访问麦克风设备，请检查麦克风是否连接正常';
                shouldDisable = true;
                break;
            case 'network':
                errorMessage = '❌ 网络错误！语音识别需要稳定的网络连接（使用 Google 语音服务）';
                shouldDisable = true;
                break;
            case 'not-authorized':
                errorMessage = '❌ 权限未授权，请允许麦克风访问权限';
                shouldDisable = true;
                break;
            case 'service-not-allowed':
                errorMessage = '❌ 语音识别服务不可用，请确保浏览器已启用语音识别功能';
                shouldDisable = true;
                break;
            default:
                errorMessage = '❌ 语音识别错误: ' + error;
        }
        
        this.log(errorMessage);
        
        if (shouldDisable) {
            this.elements.statusText.textContent = '错误';
            this.elements.startBtn.disabled = true;
            this.showErrorHint(errorMessage);
        }
    }

    handleTimeout(type) {
        this.log('⏰ 识别超时处理，类型:', type);
        
        let message = '';
        if (type === 'recognition') {
            message = '⏰ 识别超时，请重试';
            this.log('⚠️ 长时间未收到识别结果，可能原因：');
            this.log('   1. 网络连接不稳定');
            this.log('   2. 语音服务响应慢');
            this.log('   3. 麦克风音量太小或未正常工作');
        } else if (type === 'silence') {
            message = '⏰ 检测到静默，请重试';
            this.log('⚠️ 长时间未检测到声音输入');
            this.log('   1. 请确保麦克风已正确连接');
            this.log('   2. 请说话声音大一些');
            this.log('   3. 请检查系统麦克风设置');
        }
        
        this.elements.statusText.textContent = '超时';
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.statusIndicator.classList.remove('listening');
        this.elements.audioLevelPanel.style.display = 'none';
        
        this.showTimeoutHint(message);
        
        setTimeout(() => {
            this.elements.statusText.textContent = '准备就绪';
        }, 2000);
    }

    handleResult(result) {
        this.hasReceivedResult = true;
        
        const displayText = result.interim || result.final || this.transcriptText;
        this.elements.transcriptBox.textContent = displayText;

        if (result.isFinal && result.final.trim()) {
            this.transcriptText = result.final.trim();
            this.log('📝 识别到语音: "' + this.transcriptText + '"');
            
            const parsedCommand = this.parser.parse(this.transcriptText);
            
            if (parsedCommand) {
                if (parsedCommand.name !== 'unknown') {
                    this.elements.commandBox.textContent = `✅ 识别指令: ${parsedCommand.name}`;
                    this.log('📋 解析指令: ' + JSON.stringify(parsedCommand));
                    
                    const success = this.executor.execute(parsedCommand);
                    if (success) {
                        this.log('🎉 指令执行成功');
                    } else {
                        this.log('⚠️ 指令执行失败或不支持');
                    }
                } else {
                    this.elements.commandBox.textContent = '❓ 未知指令: ' + parsedCommand.text;
                    this.log('❓ 无法识别指令，请尝试使用预定义的指令');
                }
            }
            
            this.transcriptText = '';
        }
    }

    handleAudioLevel(level) {
        this.updateAudioLevel(level);
    }

    updateAudioLevel(level) {
        const percentage = Math.round(level * 100);
        this.elements.audioLevelBar.style.width = `${percentage}%`;
        this.elements.audioLevelText.textContent = `${percentage}%`;
        
        if (percentage > 0 && this.recognizer && this.recognizer.isListening) {
            this.log('🔊 检测到声音输入，音量: ' + percentage + '%', true);
        }
    }

    handleDebug(message, data) {
        console.log('[App Debug]', message, data || '');
    }

    showErrorHint(message) {
        this.elements.commandBox.innerHTML = `
            <div style="color: var(--danger-color); font-weight: normal; font-size: 0.875rem; line-height: 1.5;">
                ${message}<br>
                <span style="color: var(--text-secondary);">请检查：浏览器设置、麦克风权限、网络连接</span>
            </div>
        `;
    }

    showTimeoutHint(message) {
        this.elements.commandBox.innerHTML = `
            <div style="color: var(--listening-color); font-weight: normal; font-size: 0.875rem; line-height: 1.5;">
                ${message}<br>
                <span style="color: var(--text-secondary);">请点击"开始语音识别"按钮重试</span>
            </div>
        `;
    }

    log(message, isAudio = false) {
        if (isAudio) {
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const logBox = document.getElementById('logBox');
        
        if (logBox) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `<span class="time">[${timestamp}]</span>${message}`;
            logBox.insertBefore(logEntry, logBox.firstChild);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoiceControllerApp();
});