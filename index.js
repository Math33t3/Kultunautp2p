import express from 'express';
import { Server as SocketServer } from 'socket.io';

const app = express();

app.use('/', express.static('public'));

const httpServer = app.listen(3000, () => {
  console.log(`Server started on 3000`);
});

const io = new SocketServer(httpServer);
const pendingRequests = {}; 

/*function cleanupOldRequests() {
  const currentTime = Date.now();
  const threshold = 5 * 60 * 1000; // 5 min :)

  for (let i = pendingRequests.length - 1; i >= 0; i--) {
    if (currentTime - pendingRequests[i].timeStamp >= threshold) {
      pendingRequests.splice(i, 1);
    };
  };
  setTimeout(cleanupOldRequests, 5 * 60 * 1000);
};

cleanupOldRequests();*/

// TODO 
/*

 Skal implementere nyt mellemlag af events der sætter admin og client op
 dvs. hele ping-pong af info mm skal sendes inden
 selve ICEcandidateconnection + generation  
 dvs =>
 client sender event om ønske om session - 
 server opbevarer liste af pending med socket.id på clients 
 admin logger på - modtager listen
 vælger en på listen, når admin vælger sendes event 
 til client om at clienten skal lave et offer
 det offer får et answer med det samme 
 => stream er nu i gang

 cleanup efter terminering mm, 
 så admin er klar til at starte næste session på listen
 evt forceReload hvis der er behov. 

 Indkooperer funktionerne fra main branch - sjovt nok kun dem der er 
 relevante i forhold til det nye setup ... duh... :)
 */


io.on('connection', (socket) => {
  console.log('new connection from ', socket.id);

  socket.on('offer', (offer) => {
    console.log('new offer from ', socket.id);
    console.log(offer);
    pendingRequests[socket.id] = offer; 
    socket.broadcast.emit('offer', offer, socket.id);
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
