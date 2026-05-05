import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'security-penetration-suite-secret-key'
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.dirname(__file__), 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    
    SCAN_TIMEOUT = 300
    MAX_THREADS = 50
    DEFAULT_THREADS = 10
    
    COMMON_PORTS = [
        21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
        1433, 1434, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443, 8888
    ]
    
    WEB_PORTS = [80, 443, 8000, 8080, 8443, 8888, 9000, 9090]
    
    SENSITIVE_FILES = [
        '/.git/config',
        '/.git/HEAD',
        '/.env',
        '/.env.local',
        '/.env.development',
        '/.env.production',
        '/config.php',
        '/config.inc.php',
        '/database.php',
        '/db.php',
        '/.htaccess',
        '/.htpasswd',
        '/web.config',
        '/robots.txt',
        '/sitemap.xml',
        '/admin/',
        '/backup/',
        '/bak/',
        '/sql/',
        '/.DS_Store',
        '/README.md',
        '/CHANGELOG.md',
        '/LICENSE',
    ]
    
    COMMON_PASSWORDS = [
        'admin', 'admin123', 'password', 'password123', '123456',
        '12345678', 'qwerty', 'letmein', 'welcome', 'monkey',
        '111111', 'abc123', '123123', '000000', 'test',
        'root', 'toor', 'pass', 'pass123', 'test123'
    ]
    
    SQLI_PAYLOADS = [
        "' OR '1'='1",
        "' OR '1'='1' --",
        "' OR 1=1 --",
        '" OR 1=1 --',
        "1' OR '1'='1",
        "1' OR 1=1 --",
        "' UNION SELECT 1,2,3 --",
        "' UNION SELECT NULL,NULL,NULL --",
        "1 AND 1=1",
        "1 AND 1=2",
    ]
    
    XSS_PAYLOADS = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '\'"<script>alert(1)</script>',
        'javascript:alert(1)',
        '"><script>alert(1)</script>',
    ]
    
    CSRF_INDICATORS = [
        'csrf',
        'token',
        'authenticity',
        'xsrf',
    ]
