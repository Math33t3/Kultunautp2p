// server.js
const express = require('express');
const { Server: SocketServer } = require('socket.io');

const app = express();

app.use('/', express.static('public'));

const httpServer = app.listen(3000, () => {
  console.log(`Server started on 3000`);
});

const io = new SocketServer(httpServer);
io.on('connection', (socket) => {
  console.log('new connection from ', socket.id);

  socket.on('offer', (offer) => {
    console.log('new offer from ', socket.id);
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    console.log('new answer from ', socket.id);
    socket.broadcast.emit('answer', answer);
  });

  socket.on('icecandidate', (candidate) => {
    console.log('new ice candidate from ', socket.id);
    socket.broadcast.emit('icecandidate', candidate);
  });
});