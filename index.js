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
  console.log("bruh");
  console.log("current: " + currentTime);
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
// timeout + delay på websocket på admin.js
// on disconnect => tjek om socket havde noget onGoing

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
    socket.broadcast.emit("answer", answer);

    if (pendingRequests[answer.clientId]) {
      delete pendingRequests[answer.clientId];
      console.log("deleted: ", answer.clientId);
    }
  });

  socket.on("icecandidate", (candidate) => {
    console.log("new ice candidate from ", socket.id);
    socket.broadcast.emit("icecandidate", candidate);
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
    const pendingRequestsArray = Object.values(pendingRequests);
    socket.emit("pendingRequests", pendingRequestsArray);
  });
});
