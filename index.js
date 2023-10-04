import express from "express";
import { Server as SocketServer } from "socket.io";

const app = express();

app.use("/", express.static("public"));

const httpServer = app.listen(3000, () => {
  console.log(`Server started on 3000`);
});

const io = new SocketServer(httpServer);
const pendingRequests = {};

function cleanupOldRequests() {
  const currentTime = Date.now();
  const threshold = 5 * 60 * 1000; // 5 min :)
  for (const socketId of Object.keys(pendingRequests)) {
    console.log(pendingRequests[socketId].clientId);
    console.log(pendingRequests[socketId].timeStamp);
    console.log(currentTime - pendingRequests[socketId].timeStamp);
  }

  for (const socketId of Object.keys(pendingRequests)) {
    if (currentTime - pendingRequests[socketId].timeStamp >= threshold)  {
      console.log(`Cleaning up socketId: ${socketId}`);
      io.to(socketId).emit("adminSessionTerminated");
      delete pendingRequests[socketId];
    }
  }

  setTimeout(cleanupOldRequests, 5 * 60 * 1000); // 5 min :)
  // Hvert 5. min bliver all "Ikke-accepteret" requests, der er over 5 min gamle, slettet fra listen
  // Clienten blive notificeret og stopper med at streame data
}
cleanupOldRequests();


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

io.on("connection", (socket) => {
  console.log("new connection from ", socket.id);

  socket.on("offer", (offer) => {
    console.log("new offer from ", socket.id);

    offer.timeStamp = Date.now();
    pendingRequests[socket.id] = offer;
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    console.log("new answer from ", socket.id);
    answer.adminSocketId = socket.id;
    //socket.broadcast.emit("answer", answer);
    io.to(answer.clientId).emit("answer", answer);

    if (pendingRequests[answer.clientId]) {
      delete pendingRequests[answer.clientId];
      console.log("deleted from list: ", answer.clientId);
    }
  });

  // this is where we need to receive the socket.id from client and admin 
  socket.on('icecandidate', ({ candidate, targetSocketId }) => {
    io.to(targetSocketId).emit('icecandidate', candidate);
    console.log(`Received ICE candidate from ${socket.id} and sent it to ${targetSocketId}`);
  });


  socket.on("getPendingRequests", () => {
    const pendingRequestsArray = Object.values(pendingRequests);
    socket.emit("pendingRequests", pendingRequestsArray);
  });

  socket.on("denyRequest", (clientId) => {
    if (pendingRequests[clientId]) {
      delete pendingRequests[clientId];
      io.to(clientId).emit("adminSessionTerminated");
    }
  });

  socket.on("adminSessionTerminated", (clientId) => {
    io.to(clientId).emit("adminSessionTerminated");
    console.log(`Admin session terminated for client: ${clientId}`);
  });

  socket.on("disconnect", () => {
    if (pendingRequests[socket.id]) {
      delete pendingRequests[socket.id];
      console.log("deleted: ", socket.id);
    }
    io.emit("userDisconnected", socket.id);
    console.log("user has disconnected");
    const pendingRequestsArray = Object.values(pendingRequests);
    socket.emit("pendingRequests", pendingRequestsArray);
  });
});
