module.exports = {
  apps: [
    {
      name: 'work-escape-backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      cwd: './backend',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      restart_delay: 4000,
      max_restarts: 10
    },
    {
      name: 'work-escape-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      restart_delay: 4000,
      max_restarts: 10
    }
  ]
};
