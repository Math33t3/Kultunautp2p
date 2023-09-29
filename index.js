import express from 'express';
import { Server as SocketServer } from 'socket.io';

const app = express();

app.use('/', express.static('public'));

const httpServer = app.listen(3000, () => {
  console.log(`Server started on 3000`);
});

const io = new SocketServer(httpServer);
const pendingRequests = {}; 

function cleanupOldRequests() {
  const currentTime = Date.now();
  const threshold = 5 * 60 * 1000; // 5 min :)

  for (let i = pendingRequests.length - 1; i >= 0; i--) {
    if (currentTime - pendingRequests[i].timeStamp >= threshold) {
      pendingRequests.splice(i, 1);
    };
  };
  setTimeout(cleanupOldRequests, 5 * 60 * 1000);
};

cleanupOldRequests();

// TODO 
// confirmation ved terminate session
// skal sende event ved terminate session til client om at stoppe. 
// skal også tjekke serveren om session stadig er i listen af pending 
// timer ved client => undgå at streame data ud i intetheden
// on disconnect => tjek om socket havde noget onGoing


io.on('connection', (socket) => {
  console.log('new connection from ', socket.id);

  socket.on('offer', (offer) => {
    console.log('new offer from ', socket.id);
    pendingRequests[socket.id] = offer; 
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    console.log('new answer from ', socket.id);
    socket.broadcast.emit('answer', answer);

    // Sletter fra vores pending ved connection til en admin
    for (let i = pendingRequests.length - 1; i >= 0; i--) {
      if (pendingRequests[i].clientId === answer.clientId) {
        pendingRequests.splice(i, 1);
      };
    };
  });

  socket.on('icecandidate', (candidate) => {
    console.log('new ice candidate from ', socket.id);
    socket.broadcast.emit('icecandidate', candidate);
  });


  socket.on('getPendingRequests', () => {
    socket.emit('pendingRequests', pendingRequests);
  });

  socket.on('denyRequest', (clientId) => {
    if (pendingRequests[clientId]) {
      delete pendingRequests[clientId];
    }
  });
});
