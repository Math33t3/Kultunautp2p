'use strict';
const socket = io();
const peer = new RTCPeerConnection();
let stream = null; // Store the screen sharing stream

const clientId = Math.random().toString(36).substring(2, 8);

const helpButton = document.getElementById('need-help');
helpButton.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true
    });

    peer.addTrack(stream.getVideoTracks()[0], stream);

    const time = new Date();
    const timeStamp = time.toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
    const sdp = await peer.createOffer();
    await peer.setLocalDescription(sdp);

    socket.emit('offer', { clientId, timeStamp, sdp: peer.localDescription });
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

let adminAccepted = false;
socket.on('answer', async (adminResponse) => {
  adminAccepted = true;

  try {
    await peer.setRemoteDescription(adminResponse.sdp);
  } catch (error) {
    console.error('Error setting remote description:', error);
  }
});

peer.addEventListener('icecandidate', (event) => {
  if (event.candidate && adminAccepted) {
    socket.emit('icecandidate', event.candidate);
  }
});

socket.on('icecandidate', async (candidate) => {
  try {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ice candidate:', error);
  }
});

socket.on('adminSessionTerminated', () => {
  if (stream) {

    stream.getTracks().forEach((track) => {
      track.stop();
    });
    stream = null;
  }
  console.log('Admin has terminated the session. Stopping screen sharing.');
});
