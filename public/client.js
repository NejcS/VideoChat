var socket = io();

$('form').submit(function(){
	socket.emit('room name', $('#room-name').val());
	$('#room-name').val('');

	return false;
});