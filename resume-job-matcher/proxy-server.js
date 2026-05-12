const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const TARGET_HOST = 'ark.cn-beijing.volces.com';

const API_PATH_MAPPING = {
    '/api/embeddings': '/api/v3/embeddings',
    '/api/chat': '/api/v3/chat/completions',
    '/api/completions': '/api/v3/chat/completions'
};

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveStaticFile(req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const fullPath = path.join(__dirname, filePath);

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const contentType = getContentType(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function getTargetPath(requestUrl) {
    const parsedUrl = url.parse(requestUrl);
    const pathname = parsedUrl.pathname;

    if (API_PATH_MAPPING[pathname]) {
        console.log('[代理] 路径映射:', pathname, '->', API_PATH_MAPPING[pathname]);
        return API_PATH_MAPPING[pathname] + (parsedUrl.search || '');
    }

    if (pathname.startsWith('/api/v3/')) {
        console.log('[代理] 直接转发完整路径:', pathname);
        return requestUrl;
    }

    console.log('[代理] 未匹配到 API 路径，尝试作为 embeddings 处理');
    return '/api/v3/embeddings' + (parsedUrl.search || '');
}

function proxyRequest(req, res) {
    console.log('[代理] 收到请求:', req.method, req.url);

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        if (body.length > 0) {
            const preview = body.length > 500 ? body.substring(0, 500) + '...' : body;
            console.log('[代理] 请求体预览:', preview);
        }

        const targetPath = getTargetPath(req.url);
        const fullTargetUrl = 'https://' + TARGET_HOST + targetPath;

        console.log('[代理] 转发到:', fullTargetUrl);

        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (req.headers['authorization']) {
            headers['Authorization'] = req.headers['authorization'];
        }

        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: targetPath,
            method: req.method,
            headers: headers
        };

        const proxyReq = https.request(options, (proxyRes) => {
            console.log('[代理] 目标响应状态码:', proxyRes.statusCode);
            console.log('[代理] 目标响应头: Content-Type =', proxyRes.headers['content-type']);

            const responseHeaders = {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            };

            if (proxyRes.headers['x-request-id']) {
                responseHeaders['X-Request-ID'] = proxyRes.headers['x-request-id'];
            }

            res.writeHead(proxyRes.statusCode, responseHeaders);

            let responseBody = '';
            proxyRes.on('data', chunk => {
                responseBody += chunk.toString();
                res.write(chunk);
            });

            proxyRes.on('end', () => {
                console.log('[代理] 响应完成，状态码:', proxyRes.statusCode, '，长度:', responseBody.length, '字节');
                
                if (proxyRes.statusCode >= 400) {
                    const errorPreview = responseBody.length > 1000 ? responseBody.substring(0, 1000) + '...' : responseBody;
                    console.log('[代理] 错误响应体:', errorPreview);
                } else if (responseBody.length < 500) {
                    console.log('[代理] 响应体:', responseBody);
                }
                
                res.end();
            });
        });

        proxyReq.on('error', (error) => {
            console.error('[代理] 转发请求失败:', error);
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                error: {
                    message: '代理请求失败: ' + error.message,
                    type: 'proxy_error'
                }
            }));
        });

        proxyReq.on('timeout', () => {
            console.error('[代理] 请求超时');
            proxyReq.destroy();
            res.writeHead(504, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                error: {
                    message: '代理请求超时',
                    type: 'timeout_error'
                }
            }));
        });

        proxyReq.setTimeout(60000);

        if (body.length > 0) {
            proxyReq.write(body);
        }
        proxyReq.end();
    });
}

function isApiRequest(pathname) {
    if (API_PATH_MAPPING[pathname]) {
        return true;
    }
    if (pathname.startsWith('/api/v3/')) {
        return true;
    }
    return false;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    console.log('\n[服务器] 收到请求:', req.method, req.url);
    console.log('[服务器] 路径:', pathname);

    if (req.method === 'OPTIONS') {
        console.log('[服务器] 处理 OPTIONS 预检请求');
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    if (isApiRequest(pathname)) {
        console.log('[服务器] 识别为 API 请求，转发到代理');
        proxyRequest(req, res);
    } else {
        console.log('[服务器] 提供静态文件');
        serveStaticFile(req, res);
    }
});

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('  智能简历职位匹配度分析器 - 代理服务器');
    console.log('========================================');
    console.log(`服务器运行在: http://localhost:${PORT}`);
    console.log('');
    console.log('支持的 API 端点:');
    console.log('  - /api/embeddings        -> /api/v3/embeddings');
    console.log('  - /api/chat              -> /api/v3/chat/completions');
    console.log('  - /api/completions       -> /api/v3/chat/completions');
    console.log('  - /api/v3/*              -> 直接转发完整路径');
    console.log('');
    console.log(`目标主机: https://${TARGET_HOST}`);
    console.log('========================================\n');
});

server.on('error', (error) => {
    console.error('[服务器] 错误:', error);
});

server.on('clientError', (err, socket) => {
    console.error('[服务器] 客户端错误:', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
