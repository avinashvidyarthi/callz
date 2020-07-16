const nameField = document.getElementById("nameField");
const roomNameField = document.getElementById("roomNameField");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const getDetailsDiv = document.getElementById("getDetailsDiv");
const callingInterface = document.getElementById("callingInterface");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream, remoteStream, isCaller, info, rtcPeerConnection;

const socket = io();

const localStreamConstrains = {
  video: {
    width: 240,
    height: 240,
  },
  audio: true,
  facingMode: "user",
  frameRate: 15,
};

const iceServers = {
  iceServer: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinRoomBtn.onclick = () => {
  if (nameField.value === "" || roomNameField.value === "") {
    return swal("Error", "Name and Room Name must be filled", "error");
  }

  info = {
    roomName: roomNameField.value,
    userName: nameField.value,
  };

  socket.emit("createOrJoin", info);
};

socket.on("roomCreated", (info) => {
  console.log("Room Created");
  navigator.mediaDevices
    .getUserMedia(localStreamConstrains)
    .then((stream) => {
      isCaller = true;
      localStream = stream;
      localVideo.srcObject = stream;
      callingInterface.style.display = "block";
      getDetailsDiv.style.display = "none";
    })
    .catch((err) => {
      console.log(err);
      swal("Error", "Something went wrong", "error");
    });
});

socket.on("roomJoined", (info) => {
  console.log("Room Joined");
  navigator.mediaDevices
    .getUserMedia(localStreamConstrains)
    .then((stream) => {
      isCaller = false;
      localStream = stream;
      localVideo.srcObject = stream;
      socket.emit("ready", info);
      callingInterface.style.display = "block";
      getDetailsDiv.style.display = "none";
    })
    .catch((err) => {
      console.log(err);
      swal("Error", "Something went wrong", "error");
    });
});

socket.on("ready", (infor) => {
  console.log("Ready");
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addTrack;
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.createOffer().then((sessionDescription) => {
      rtcPeerConnection.setLocalDescription(sessionDescription);
      socket.emit("offer", {
        sdp: sessionDescription,
        info: info,
      });
    });
  }
});

socket.on("offer", (infor) => {
  console.log("Offer");
  if (!isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addTrack;
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(infor.sdp));
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.createAnswer().then((sessionDescription) => {
      rtcPeerConnection.setLocalDescription(sessionDescription);
      socket.emit("answer", {
        sdp: sessionDescription,
        info: info,
      });
    });
  }
});

socket.on("answer", (info) => {
  console.log("Answer");
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(info.sdp));
});

socket.on('candidate',(event)=>{
  console.log("Ice Candidate");
  const candidate=new RTCIceCandidate({
    sdpMLineIndex:event.label,
    candidate:event.candidate
  })
  rtcPeerConnection.addIceCandidate(candidate);
})

function addTrack(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

function onIceCandidate(event){
  if(event.candidate){
    socket.emit('candidate',{
      label:event.candidate.sdpMLineIndex,
      id:event.candidate.sdpMid,
      candidate:event.candidate.candidate,
      info:info
    })
  }
}
