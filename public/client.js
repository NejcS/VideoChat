var socket = io();

$('form.room-prompt').submit(function(){
	socket.emit('room name', $('#room-name').val());
	$(this).hide('');

	return false;
});

$('form.data-prompt').submit(function(){
	socket.emit('messageToRoom', $('#data').val());
	$('#data').val('');

	return false;
});

socket.on('roomBroadcast', function(data) {
	alert(data);
});