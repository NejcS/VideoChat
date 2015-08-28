var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

var Room = require('./Room.js');
var rooms = {};

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
	var currentRoom;

	socket.on('roomName', function(userName, roomName) {
		console.log(userName + " " + roomName);
		var room1 = new Room(roomName, 234, 2);

		if (rooms[roomName]) {
			var joinStatus = rooms[roomName].join(socket.client.conn.id);

			if (!joinStatus) {
				console.log('The room is full.');
				return;
			} else {
				socket.join(roomName);
				socket.emit("joinedRoom", {roomName: roomName, isInitiator: false});
				socket.broadcast.to(roomName).emit('peer joined room');
			}
		} else {
			rooms[roomName] = new Room(roomName, socket.client.conn.id, 2);
			socket.join(roomName);
			socket.emit("joinedRoom", {roomName: roomName, isInitiator: true});
		}
		currentRoom = roomName;
	});

	socket.on('message', function(message) {
		socket.broadcast.to(currentRoom).emit('message to peers', message);
	});

});

http.listen(3000, function(){
	console.log('listening on *:3000');
});