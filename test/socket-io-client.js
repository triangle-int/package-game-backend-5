/* eslint-disable @typescript-eslint/no-var-requires */
const { argv } = require('process');
const { io } = require('socket.io-client');

const socket = io('ws://127.0.0.1:3000', {
  auth: {
    token: argv[2],
  },
});

socket.on('connect', () => {
  console.log('connected');
});

socket.on('update', (data) => {
  console.log(data);
});
