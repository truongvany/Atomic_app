import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${config.PORT}`);
});
