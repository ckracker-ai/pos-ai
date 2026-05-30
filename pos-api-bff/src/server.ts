import createApp from './app.js';
import config from './config/index.js';

const app = createApp();

const start = async () => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`API BFF listening on port ${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
