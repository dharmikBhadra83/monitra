module.exports = {
  apps: [{
    name: 'monitra',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/ubuntu/monitra',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env.local',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '2G',  // Increased from 1G to 2G
  }]
};