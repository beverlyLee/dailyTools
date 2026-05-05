/**
 * 前端启动脚本
 * 自动读取后端端口配置并设置环境变量
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取后端保存的端口配置
function getBackendPort() {
    try {
        const portFile = path.join(__dirname, '..', 'backend', '.port');
        if (fs.existsSync(portFile)) {
            const port = fs.readFileSync(portFile, 'utf8').trim();
            if (port && !isNaN(parseInt(port))) {
                return parseInt(port);
            }
        }
    } catch (error) {
        console.log('未找到后端端口配置，使用默认端口 5000');
    }
    return 5000;
}

// 主函数
function main() {
    const backendPort = getBackendPort();
    
    console.log('========================================');
    console.log('数据工程调度平台 - 前端启动');
    console.log('========================================');
    console.log(`后端 API 端口: ${backendPort}`);
    console.log(`API 地址: http://localhost:${backendPort}`);
    console.log('========================================\n');
    
    // 设置环境变量
    process.env.REACT_APP_API_URL = `http://localhost:${backendPort}`;
    
    console.log(`已设置 REACT_APP_API_URL=${process.env.REACT_APP_API_URL}`);
    console.log('正在启动前端服务...\n');
    
    // 启动 React 开发服务器
    try {
        execSync('npm run start:react', { 
            stdio: 'inherit',
            env: { ...process.env }
        });
    } catch (error) {
        console.error('启动失败:', error.message);
        process.exit(1);
    }
}

main();
