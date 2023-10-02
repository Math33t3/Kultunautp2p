"use strict";
const socket = io();
let peer = null;
const video = document.getElementById("client-screen");
const pendingRequests = {};
let currentClientId = null;

function createPeerConnection() {
  if (peer) {
    peer.close();
  }
  peer = new RTCPeerConnection();

  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      socket.emit("icecandidate", event.candidate);
    }
  });

  peer.addEventListener("track", (event) => {
    if (event.streams && event.streams[0]) {
      video.srcObject = event.streams[0];
    }
  });
}

function fetchPendingRequests() {
  socket.emit("getPendingRequests");
}

function addPendingRequest(clientId, clientSDP, timeStamp, infoObject) {
  pendingRequests[clientId] = clientSDP;
  const pendingRequestsList = document.getElementById("pending-requests");
  const listItem = document.createElement("li");

  console.log(infoObject);

  const date = new Date(timeStamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); 
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const formattedTimestamp = `${day}-${month} ${hours}:${minutes}`;

  listItem.textContent = `Client ${clientId} - Pending Request - ${formattedTimestamp} - \n${infoObject.hubba} -\n${infoObject.mad}`;


  const acceptButton = document.createElement("button");
  acceptButton.style.backgroundColor = "greenyellow";
  acceptButton.textContent = "Accept";
  acceptButton.addEventListener("click", () => {
    handleConfirmation(clientId);
  });

  const denyButton = document.createElement("button");
  denyButton.style.backgroundColor = "pink";
  denyButton.textContent = "Deny";
  denyButton.addEventListener("click", () => {
    handleDeny(clientId);
  });

  listItem.appendChild(acceptButton);
  listItem.appendChild(denyButton);

  pendingRequestsList.appendChild(listItem);
}

function handleDeny(clientId) {
  socket.emit("denyRequest", clientId);

  const pendingRequestsList = document.getElementById("pending-requests");
  const listItems = pendingRequestsList.getElementsByTagName("li");
  for (let i = 0; i < listItems.length; i++) {
    if (
      listItems[i].textContent.includes(`Client ${clientId} - Pending Request`)
    ) {
      listItems[i].remove();
      break;
    }
  }
}

async function handleConfirmation(clientId) {
  const clientSDP = pendingRequests[clientId];

  if (!clientSDP) {
    console.error(`No pending request found for Client ${clientId}`);
    return;
  }

  cleanup();
  createPeerConnection();

  try {
    await peer.setRemoteDescription(clientSDP);

    const sdp = await peer.createAnswer();
    await peer.setLocalDescription(sdp);

    socket.emit("answer", { clientId, sdp: peer.localDescription });

    delete pendingRequests[clientId];
    const pendingRequestsList = document.getElementById("pending-requests");
    const listItems = pendingRequestsList.getElementsByTagName("li");
    for (let i = 0; i < listItems.length; i++) {
      if (
        listItems[i].textContent.includes(
          `Client ${clientId} - Pending Request`
        )
      ) {
        listItems[i].remove();
        break;
      }
    }
    const screen = document.getElementById("client-screen-container");
    screen.classList.toggle("active-screen", true);
    currentClientId = clientId;
  } catch (error) {
    console.error("Error handling confirmation:", error);
  }
}

function cleanup() {
  if (peer) {
    peer.close();
    peer = null;
  }
  video.srcObject = null;
  const screen = document.getElementById("client-screen-container");
  screen.classList.toggle("active-screen", false);
  console.log("cleaning up: "+ currentClientId);
  currentClientId = null;
}

socket.on("pendingRequests", (requests) => {
  for (const request of requests) {
    const clientId = request.clientId;
    const clientSDP = request.sdp;
    const timeStamp = request.timeStamp;
    const infoObject = request.infoObject;
    addPendingRequest(clientId, clientSDP, timeStamp, infoObject);
  }
});

socket.on("offer", async (offerData) => {
  const timeStamp = offerData.timeStamp;
  const clientId = offerData.clientId;
  const clientSDP = offerData.sdp;
  const infoObject = offerData.infoObject;
  addPendingRequest(clientId, clientSDP, timeStamp, infoObject);
});

socket.on("icecandidate", async (candidate) => {
  try {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error("Error adding ice candidate:", error);
  }
});



function terminateSession() {
  if (confirm(`Are you sure you want to end the session?`)) {
    if (currentClientId) {
      informClientSessionTermination();
    }
    setTimeout(cleanup(), 2000);
  };
};

socket.on("userDisconnected", async (clientId) => {
  if(clientId === currentClientId) {
    if(confirm(`The Client ended the ongoing session?`)) {
      cleanup();
    } else {
      setTimeout(cleanup(), 2000);
    }
  }; 
});

function informClientSessionTermination() {
  console.log('Admin prøver at terminate .' + currentClientId);
  socket.emit('adminSessionTerminated', currentClientId);
};

const terminateButton = document.getElementById("terminate-button");
terminateButton.addEventListener("click", terminateSession);

fetchPendingRequests();
