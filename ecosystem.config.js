module.exports = {
    apps: [
      {
        name: 'Convertor',
        script: 'npm',
        args: 'start',
        cwd: '/home/ubuntu/Convertor',
        env: {
          NODE_ENV: 'production',
        },
      },
    ],
  };