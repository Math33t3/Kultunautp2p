'use strict';

let socket = null; 

const peer = new RTCPeerConnection();
let stream = null;
let clientId;
let adminSocketId;

const helpButton = document.getElementById('need-help');

helpButton.addEventListener('click', async () => {
  try {
    if (!socket) { 
      socket = io();
      socket.on('connect', () => {
        clientId = socket.id;
        console.log(clientId);
      });
  
      socket.on('answer', async (adminResponse) => {
        adminAccepted = true;
        adminSocketId = adminResponse.adminSocketId;
        console.log("DEN HER: " ,adminSocketId);
        try {
          await peer.setRemoteDescription(adminResponse.sdp);
        } catch (error) {
          console.error('Error setting remote description:', error);
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
        socket.close();
        socket = null; // Reset the socket variable to null
        console.log('Admin has terminated the session. Stopping screen sharing.');
      });
    }
  
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });
  
    peer.addTrack(stream.getVideoTracks()[0], stream);
  
    const infoObject = { hubba: 'bubba', mad: 'ostemad' };
  
    const sdp = await peer.createOffer();
    await peer.setLocalDescription(sdp);
  
    socket.emit('offer', { clientId, infoObject, sdp: peer.localDescription });
  } catch (error) {
    console.error(error);
    alert(error.message);
  }

  
  peer.addEventListener('icecandidate', (event) => {
    if (event.candidate && adminAccepted) {
      event.candidate.targetSocketId = adminSocketId
      socket.emit('icecandidate', event.candidate, adminSocketId);
    }
  });
});

let adminAccepted = false;


