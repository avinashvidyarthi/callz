const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log("App running on port: " + port);
});
const io = require("socket.io").listen(server);


app.use("/", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile("./public/index.html");
});

io.on("connection", (socket) => {

  socket.on("createOrJoin", (info) => {
    const myRoom = io.sockets.adapter.rooms[info.roomName] || { length: 0 };
    if (myRoom.length === 0) {
      socket.join(info.roomName);
      socket.emit("roomCreated", info);
    } else if (myRoom.length === 1) {
      socket.join(info.roomName);
      socket.emit("roomJoined", info);
    } else {
      socket.emit("roomFull", info);
    }
  });

  socket.on('ready',(info)=>{
    socket.broadcast.to(info.roomName).emit('ready');
  })

  socket.on('candidate',(info)=>{
    socket.broadcast.to(info.info.roomName).emit('candidate',info);
  })

  socket.on('offer',(info)=>{
    socket.broadcast.to(info.info.roomName).emit('offer',info);
  })

  socket.on('answer',(info)=>{
    socket.broadcast.to(info.info.roomName).emit('answer',info);
  })
  socket.on("disconnect", () => {
  });
});


