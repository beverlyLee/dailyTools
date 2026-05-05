# 数据工程调度平台 - Windows 本地启动脚本

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "数据工程调度平台 - 本地启动脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 检查 Python 是否安装
try {
    $pythonVersion = python --version
    Write-Host "Python 版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: Python 未安装，请先安装 Python 3.9+" -ForegroundColor Red
    exit 1
}

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: Node.js 未安装，请先安装 Node.js 18+" -ForegroundColor Red
    exit 1
}

# 进入项目目录
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# 检查端口 5000 是否被占用
$port5000InUse = $false
try {
    $connections = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $port5000InUse = $true
        Write-Host ""
        Write-Host "⚠️  检测到端口 5000 已被占用" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "本脚本会自动尝试使用其他端口（5001, 5002...）" -ForegroundColor White
        Write-Host ""
    }
} catch {
    # 忽略错误
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "步骤 1: 安装后端依赖..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Set-Location backend

# 检查是否已有虚拟环境
if (-not (Test-Path "venv")) {
    Write-Host "创建 Python 虚拟环境..." -ForegroundColor Yellow
    python -m venv venv
}

# 激活虚拟环境
Write-Host "激活虚拟环境..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# 安装依赖
Write-Host "安装 Python 依赖..." -ForegroundColor Yellow
pip install -r requirements-local.txt

# 复制环境变量配置（如果不存在）
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "已创建 .env 配置文件" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "步骤 2: 安装前端依赖..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Set-Location ..\frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "安装 Node.js 依赖..." -ForegroundColor Yellow
    npm install
}

# 复制环境变量配置（如果不存在）
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "已创建 .env 配置文件" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "步骤 3: 启动后端服务..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Set-Location ..\backend
& .\venv\Scripts\Activate.ps1

# 清理旧的端口文件
$portFile = Join-Path $PWD ".port"
if (Test-Path $portFile) {
    Remove-Item $portFile -Force
}

# 在后台启动后端
Write-Host "启动后端服务（将自动查找可用端口）..." -ForegroundColor Yellow
$backendProcess = Start-Process python -ArgumentList "run-local.py" -PassThru -WindowStyle Normal

# 等待后端启动并保存端口配置
Write-Host "等待后端启动..." -ForegroundColor White
$backendPort = 5000
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host -NoNewline "." -ForegroundColor White
    
    if (Test-Path $portFile) {
        $portContent = Get-Content $portFile -Raw
        if ($portContent -and $portContent.Trim() -match "^\d+$") {
            $backendPort = [int]$portContent.Trim()
            break
        }
    }
}
Write-Host ""

# 检查后端是否启动成功
if ($backendProcess.HasExited) {
    Write-Host "❌ 后端服务启动失败" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ 后端服务启动成功，端口: $backendPort (PID: $($backendProcess.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "步骤 4: 启动前端服务..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Set-Location ..\frontend

Write-Host "前端将自动连接到后端端口: $backendPort" -ForegroundColor White
Write-Host "启动前端服务 (端口: 3000)..." -ForegroundColor Yellow
$frontendProcess = Start-Process npm -ArgumentList "start" -PassThru -WindowStyle Normal

# 等待前端启动
Write-Host "等待前端启动..." -ForegroundColor White
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ 服务启动完成！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  - 前端界面: http://localhost:3000" -ForegroundColor White
Write-Host "  - 后端 API: http://localhost:$backendPort" -ForegroundColor White
Write-Host ""
Write-Host "进程信息:" -ForegroundColor Cyan
Write-Host "  - 后端 PID: $($backendProcess.Id)" -ForegroundColor White
Write-Host "  - 前端 PID: $($frontendProcess.Id)" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "常用命令:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "停止所有服务:" -ForegroundColor Yellow
Write-Host "  直接关闭打开的终端窗口" -ForegroundColor White
Write-Host "  或者在任务管理器中结束进程" -ForegroundColor White
Write-Host ""
Write-Host "单独启动后端:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python run-local.py" -ForegroundColor White
Write-Host ""
Write-Host "单独启动前端:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "提示: 请保持打开的终端窗口运行" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 打开浏览器
try {
    Start-Process "http://localhost:3000"
    Write-Host "已自动打开浏览器访问前端界面..." -ForegroundColor Green
} catch {
    Write-Host "请手动打开浏览器访问: http://localhost:3000" -ForegroundColor Yellow
}
