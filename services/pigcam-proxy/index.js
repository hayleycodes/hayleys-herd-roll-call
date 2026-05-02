require('dotenv').config({ path: '../../.env' });
const express = require('express');

const app = express();
const { proxy } = require('rtsp-relay')(app);

const url = process.env.PIG_CAM_RTSP;
console.log(`RTSP URL configured: ${url ? 'yes' : 'no'}`);

const handler = proxy({
  url,
  transport: 'tcp',
  useNativeFFmpeg: true,
});

app.ws('/stream', handler);

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`pigcam proxy listening on 0.0.0.0:${port}`);
});
