const nameField = document.getElementById("nameField");
const roomNameField = document.getElementById("roomNameField");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const getDetailsDiv = document.getElementById("getDetailsDiv");
const callingInterface = document.getElementById("callingInterface");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const msgInput = document.getElementById("msgInput");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const messageBox = document.getElementById("messageBox");
const muteToggleBtn = document.getElementById("muteToggleBtn");
const callEndBtn = document.getElementById("callEndBtn");
const heartBtn = document.getElementById("heartBtn");
const clapBtn = document.getElementById("clapBtn");
const likeBtn = document.getElementById("likeBtn");
const helperBtns = document.getElementById("helperBtns");
const reactionArea = document.getElementById("reactionArea");
const aboutArea = document.getElementById("about");

var qs = (function (a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i) {
    var p = a[i].split("=", 2);
    if (p.length == 1) b[p[0]] = "";
    else b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split("&"));

if (qs["room"]) {
  roomNameField.value = qs["room"];
}

let localStream,
  remoteStream,
  remoteUserName,
  isCaller,
  info,
  rtcPeerConnection,
  dataChannel,
  localVideoInSmallBox = true,
  audioSender,
  isMute = false;

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
  if (!window.navigator.onLine) {
    return swal("Offline!", "You are not connected to Internet.", "error");
  }
  joinRoomBtn.innerHTML = "Joining...";
  joinRoomBtn.disabled = "true";
  info = {
    roomName: roomNameField.value.toLowerCase(),
    userName: nameField.value,
  };
  aboutArea.style.display = "none";
  socket.emit("createOrJoin", info);
};

sendMsgBtn.onclick = () => {
  if (msgInput.value === "") {
    return;
  }
  dataChannel.send("msg&#&" + info.userName + "&#&" + msgInput.value);
  addMessage("YOU", msgInput.value);
  msgInput.value = "";
};

// localVideo.onclick = () => {
//   if (localVideoInSmallBox) {
//     remoteVideo.srcObject = localStream;
//     localVideo.srcObject = remoteStream;
//     remoteVideo.muted = true;
//     localVideo.muted = false;
//     localVideoInSmallBox = !localVideoInSmallBox;
//   } else {
//     remoteVideo.muted = false;
//     localVideo.muted = true;
//     remoteVideo.srcObject = remoteStream;
//     localVideo.srcObject = localStream;
//     localVideoInSmallBox = !localVideoInSmallBox;
//   }
// };

muteToggleBtn.onclick = () => {
  if (!isMute) {
    dataChannel.send("mute");
    muteToggleBtn.classList = "btn btn-danger";
    addMessage("YOU", "MUTED!");
  } else {
    dataChannel.send("unmute");
    muteToggleBtn.classList = "btn btn-secondary";
    addMessage("YOU", "UNMUTED!");
  }
  isMute = !isMute;
};

callEndBtn.onclick = () => {
  rtcPeerConnection.close();
  window.location.reload();
};

socket.on("roomCreated", (info) => {
  console.log("Room Created");
  swal({
    text:
      "Share this link: " + window.location.origin + "?room=" + info.roomName,
    buttons: {
      cancel: true,
      confirm: {
        text: "Copy",
        value: "copy",
      },
    },
  }).then((data) => {
    if (data === "copy") {
      navigator.clipboard
        .writeText(window.location.origin + "?room=" + info.roomName)
        .then(() => {
          swal("Copied!", "", "success");
        });
    }
  });
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
    remoteUserName = infor.userName;
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addTrack;
    rtcPeerConnection.onconnectionstatechange = stateListener;
    audioSender = rtcPeerConnection.addTrack(
      localStream.getTracks()[0],
      localStream
    );
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    dataChannel = rtcPeerConnection.createDataChannel(info.roomName);

    dataChannel.onmessage = (event) => {
      handelData(event.data);
    };

    dataChannel.onopen = () => {
      console.log("Data chanel open");
      sendMsgBtn.disabled = false;
      heartBtn.disabled = false;
      clapBtn.disabled = false;
      likeBtn.disabled = false;
    };

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
    remoteUserName = infor.info.userName;
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addTrack;
    rtcPeerConnection.onconnectionstatechange = stateListener;
    rtcPeerConnection.setRemoteDescription(
      new RTCSessionDescription(infor.sdp)
    );
    audioSender = rtcPeerConnection.addTrack(
      localStream.getTracks()[0],
      localStream
    );
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.onmessage = (e) => {
        handelData(e.data);
      };

      dataChannel.onopen = () => {
        console.log("Data chanel open");
        sendMsgBtn.disabled = false;
        heartBtn.disabled = false;
        clapBtn.disabled = false;
        likeBtn.disabled = false;
      };
    };
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

socket.on("candidate", (event) => {
  console.log("Ice Candidate");
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

socket.on("roomFull", (info) => {
  swal("Room Full!", "Try other room!", "error");
});

function addTrack(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
  document.getElementById(
    "remoteUserName"
  ).innerHTML = remoteUserName.toUpperCase();
  waitingImg.style.display = "none";
  remoteVideo.style.display = "block";
}

function onIceCandidate(event) {
  if (event.candidate) {
    socket.emit("candidate", {
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      info: info,
    });
  }
}

function handelData(str) {
  const dataReceived = str.split("&#&");
  if (dataReceived[0] === "msg") {
    addMessage(dataReceived[1], dataReceived[2]);
  }
  if (dataReceived[0] === "reaction") {
    react({ origin: "remote", type: dataReceived[1] });
  }
  if (str === "mute") {
    remoteVideo.muted = true;
    addMessage(remoteUserName, "MUTED!");
  }
  if (str === "unmute") {
    remoteVideo.muted = false;
    addMessage(remoteUserName, "UNMUTED!");
  }
}

function addMessage(user, msg) {
  if (user === "YOU") {
    messageBox.innerHTML += "<div class='text-primary'>YOU: " + msg + "</div>";
  } else {
    messageBox.innerHTML +=
      "<div class='text-danger'>" + user.toUpperCase() + ": " + msg + "</div>";
  }
  messageBox.scrollTop = messageBox.scrollHeight;
}

function react(reactionType) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML =
    "<img src='./assets/" +
    reactionType.type +
    ".png' width='50px' height='50px' alt='" +
    reactionType.type +
    "' />";
  newDiv.classList =
    "animate__animated animate__slower animate__fadeOutUp reaction";
  reactionArea.appendChild(newDiv);
  setTimeout(() => {
    reactionArea.removeChild(newDiv);
  }, 3000);

  let origin = reactionType.origin || "local";
  if (origin === "local") {
    dataChannel.send("reaction&#&" + reactionType.type);
  }
}

function stateListener(event) {
  switch (rtcPeerConnection.connectionState) {
    case "connected": {
      console.log("Connected");
      break;
    }
    case "disconnected": {
      swal("Disconnected!", "Other user disconnected.", "error");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      break;
    }
    case "failed": {
      console.log("failed");
      break;
    }
    case "closed": {
      window.location.reload();
      break;
    }
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then((e) => {
    console.log("[SW] Registered");
  });
}

window.addEventListener("beforeinstallprompt", function (event) {
  console.log("[SW] Before Install");
});
