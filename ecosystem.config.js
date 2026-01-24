module.exports = {
  apps: [{
    name: 'monitra',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/ubuntu/projects/monitra',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/monitra-error.log',
    out_file: '/var/log/pm2/monitra-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', '.next', '.git']
  }]
};
