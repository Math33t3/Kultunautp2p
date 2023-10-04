'use strict';
let socket = null; 

const peer = new RTCPeerConnection();
let clientId;
let adminSocketId;
let adminAccepted = false;


const helpButton = document.getElementById('need-help');
helpButton.addEventListener('click', async () => {
  try {
    if (!socket) { 
      socket = io();
      socket.on('connect', () => {
        clientId = socket.id;
        console.log(clientId);
      });

      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true
      });

      peer.addTrack(stream.getVideoTracks()[0], stream);

      const sdp = await peer.createOffer();
      await peer.setLocalDescription(sdp);
      socket.emit('offer', peer.localDescription );

      socket.on('answer', async (adminResponse) => {
        adminAccepted = true;
        await peer.setRemoteDescription(adminResponse);
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
        }
        console.log('Admin has terminated the session. Stopping screen sharing.');
      });  
  } 
}catch (error) {
    console.error(error);
    alert(error.message);
  }
});


peer.addEventListener('icecandidate', (event) => {
  if (event.candidate) {
    socket.emit('icecandidate', event.candidate);
  }
});


