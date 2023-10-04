"use strict";
const socket = io();
const peer = new RTCPeerConnection();
const video = document.getElementById("client-screen");
const pendingRequests = {};

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

function fetchPendingRequests() {
  socket.emit("getPendingRequests");
}

function addPendingRequest(clientId, clientSDP, timeStamp) {
  pendingRequests[clientId] = clientSDP;
  const pendingRequestsList = document.getElementById("pending-requests");
  const listItem = document.createElement("li");
  listItem.textContent = `Client ${clientId} - Pending Request - ${timeStamp}`;

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

  if (confirm(`Accept the screenshare request from Client ${clientId}?`)) {
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
    } catch (error) {
      console.error("Error handling confirmation:", error);
    }
  }
}

function cleanup() {
  if (peer) {
    peer.close();
  }
  video.srcObject = null;
  const screen = document.getElementById("client-screen-container");
  screen.classList.toggle("active-screen", false);
}

socket.on("pendingRequests", (requests) => {
  for (const request of requests) {
    const clientId = request.clientId;
    const clientSDP = request.sdp;
    const timeStamp = request.timeStamp;
    addPendingRequest(clientId, clientSDP, timeStamp);
  }
});

socket.on("offer", async (offerData) => {
  const timeStamp = offerData.timeStamp;
  const clientId = offerData.clientId;
  const clientSDP = offerData.sdp;
  addPendingRequest(clientId, clientSDP, timeStamp);
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
    cleanup();
    informClientSessionTermination();
  }
}
function informClientSessionTermination() {
  socket.emit("adminSessionTerminated");
}

const terminateButton = document.getElementById("terminate-button");
terminateButton.addEventListener("click", terminateSession);

fetchPendingRequests();
