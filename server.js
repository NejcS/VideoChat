var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

	socket.on('room name', function(roomName) {
		console.log(roomName);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});