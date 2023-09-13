// public/client.js
'use strict';
const socket = io();
const peer = new RTCPeerConnection();

const helpButton = document.getElementById('need-help');
helpButton.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
      preferCurrentTab: true,
    });

    peer.addTrack(stream.getVideoTracks()[0], stream);

    const sdp = await peer.createOffer();
    await peer.setLocalDescription(sdp);
    socket.emit('offer', peer.localDescription);
  } catch (error) {

    console.error(error);
    alert(error.message);
  }
});

socket.on('answer', async (adminSDP) => {
  peer.setRemoteDescription(adminSDP);
});

peer.addEventListener('icecandidate', (event) => {
  if (event.candidate) {
    socket.emit('icecandidate', event.candidate);
  }
});
socket.on('icecandidate', async (candidate) => {
  await peer.addIceCandidate(new RTCIceCandidate(candidate));
});