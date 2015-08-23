$.material.init() // za ripple effect je treba še neki dodat
var socket = io();

(function() {
	var $navbar = $("body > .navbar");
	var $container = $("body > .container-fluid");
	var $modal = $container.find("#myModal");

	var connect = function(isCaller) {
		var getUserMedia = navigator.getUserMedia ||
  			navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		
  		var pc = new webkitRTCPeerConnection(null);		// TODO: set the appropriate configuration object

  		pc.onicecandidate = function(evt) {
  			var data = JSON.stringify({"candidate": evt.candidate});
  			socket.emit("message", data);
  		};

  		// when stream from friend arrives, inject it into the <video>
  		pc.onaddstream = function(evt) {
  			$container.find("#away-video")[0].src = URL.createObjectURL(evt.stream);
  		}

  		var gotDescription = function(desc) {
  			pc.setLocalDescription(desc);

  			var data = JSON.stringify({ "sdp": desc });
  			socket.emit("message", data);
  		}

		getUserMedia.call(navigator, 	{video: true},
		  function success(stream) {
			// play the stream on the smaller <video>
			var video = $container.find("#home-video")[0];
			video.src = window.URL.createObjectURL(stream);
			video.play();

			pc.addStream(stream)

			if (isCaller) {
				pc.createOffer(gotDescription);
			} else {
				pc.createAnswer(pc.remoteDescription, gotDescription);
			}

		}, function fail(error) {
			console.log("getUserMedia error: ", error);
			return;
		});
	};

	var joinRoom = function() {
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
		socket.on("joinedRoom", function(room) {
			$container.find("div.room-name").append(room);
		});

		socket.emit('roomName', userName, roomName);
		$modal.modal('toggle');
	}

	socket.on("message to peers", function(message) {
		/*
			check the type of data and do what needs to be done ...
		*/
	});

	setTimeout(function() {
		$container.find("#myModal").modal();

		$container.find("#myModal button").click(joinRoom);
		$(document).keypress(function(e) {
		    if(e.which == 13) {
		        joinRoom();
		    }
		});

	}, 1000);

	$container.find("#makeCall").click(function() {
		connect(true);
	});
}());