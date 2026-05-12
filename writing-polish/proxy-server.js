const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8081;

const server = http.createServer((req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Proxy server is running' }));
        return;
    }

    if (req.url === '/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                forwardRequest(requestData, res);
            } catch (error) {
                console.error('[Proxy] 解析请求体失败:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

function forwardRequest(requestData, res) {
    const { endpoint, headers, body } = requestData;

    if (!endpoint) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint is required' }));
        return;
    }

    console.log(`[Proxy] 转发请求到: ${endpoint}`);

    const targetUrl = url.parse(endpoint);
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    const proxyReq = client.request(options, (proxyRes) => {
        let responseBody = '';

        proxyRes.on('data', chunk => {
            responseBody += chunk.toString();
        });

        proxyRes.on('end', () => {
            console.log(`[Proxy] 响应状态码: ${proxyRes.statusCode}`);

            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(responseBody);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('[Proxy] 请求错误:', error.message);
        res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: error.message }));
    });

    if (body) {
        proxyReq.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    proxyReq.end();
}

server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 代理服务器已启动`);
    console.log(`📡 监听端口: ${PORT}`);
    console.log(`🎯 代理地址: http://localhost:${PORT}/proxy`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
    console.log(`========================================`);
    console.log(`使用说明:`);
    console.log(`1. 保持此终端窗口打开`);
    console.log(`2. 在写作助手的配置中勾选"使用本地代理"`);
    console.log(`3. 点击"测试连接"验证`);
    console.log(`========================================`);
});

process.on('SIGINT', () => {
    console.log('\n[Proxy] 正在关闭服务器...');
    server.close(() => {
        console.log('[Proxy] 服务器已关闭');
        process.exit(0);
    });
});
