const allowedOrigins = require("./config/allowedOrigins")
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: allowedOrigins,
});

const PORT = process.env.PORT || 3001;

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`New client connected : ${socket.id}`);

  let joinedRoom = null;

  //TODO: 
  socket.on("findGame", (data) => {
    // If a room is available with 1 player, join that room

    console.log(`${socket.id} has requested to join a room.`);

    for (const [roomId, players] of rooms.entries()) {
      if (players.length === 1) {
        joinedRoom = roomId;
        players.push(socket.id);
        break;
      }
    }

    //If no room is available, create a new room
    if (!joinedRoom) {
      joinedRoom = `room-${rooms.size + 1}`;
      rooms.set(joinedRoom, [socket.id]);
    }
    socket.join(joinedRoom);

    // Emit the joinedGame event to the client
    console.log(`Client ${socket.id} joined room ${joinedRoom}`);
    socket.emit("joinedGame", {room: joinedRoom, players: rooms.get(joinedRoom)});

    const players = rooms.get(joinedRoom);
    if (players.length === 2) {
      io.in(joinedRoom).emit("startGame");
    }
  });

  socket.on("sendMove", (data) => {
    socket.to(joinedRoom).emit("receiveMove", data);
  });

  socket.on("gameOver", (data) => {
    socket.to(joinedRoom).emit("gameOver", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    io.in(joinedRoom).emit("opponentDisconnected");
    rooms.delete(joinedRoom);
    // const players = rooms.get(joinedRoom);
    // if(players){
    //   players.splice(players.indexOf(socket.id), 1);
    //   if (players.length === 0) {
    //     rooms.delete(joinedRoom);
    //   }
    // }
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
