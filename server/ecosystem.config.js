module.exports = {
  apps: [{
    name: 'claude-tracker-api',
    script: 'dist/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
