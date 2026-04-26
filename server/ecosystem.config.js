module.exports = {
  apps: [{
    name: 'claude-tracker-api',
    script: 'dist/src/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
