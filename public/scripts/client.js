$.material.init() // za ripple effect je treba še neki dodat
var socket = io();

// socket.emit('messageToRoom', $('#data').val());

//socket.on('roomBroadcast', function(data) {
//	alert(data);
//});

(function() {
	var $navbar = $("body > .navbar");
	var $container = $("body > .container-fluid");

	setTimeout(function() {
		$container.find("#myModal").modal();
	}, 1000);

	var connect = function() {
		navigator.getUserMedia = navigator.getUserMedia ||
  			navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		debugger;
	};

	$container.find("#myModal button").click(function() {
		var userName = $container.find("#myModal #userNameInput").val();
		var roomName = $container.find("#myModal #roomNameInput").val();

		if ((!userName || userName === '') && (!roomName || roomName === '')) {
			$container.find("#myModal .alert.no-data").show();
			return;
		} else if (!userName || userName === '') {
			$container.find("#myModal .alert.no-user").show();
			return;
		} else if (!roomName || roomName === '') {
			$container.find("#myModal .alert.no-room").show();
			return;
		}

		socket.emit('roomName', userName, roomName);
		connect();
	});
}());