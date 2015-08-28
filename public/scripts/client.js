$.material.init() // za ripple effect je treba še neki dodat
var socket = io();

(function() {
	var $navbar = $("body > .navbar");
	var $container = $("body > .container-fluid");
	var $modal = $container.find("#myModal");
	var isStarted = false;
	var isInitiator = false;
	var isChannelReady = false;
	var pc;
	var localStream;
	var remoteStream;
	var getUserMedia = navigator.getUserMedia ||
  			navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	var sdpConfig = {'mandatory': {
		'OfferToReceiveAudio':true,
		'OfferToReceiveVideo':true }
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
		socket.on("joinedRoom", function(doc) {
			isInitiator = doc.isInitiator;
			$container.find("div.room-name").append(doc.roomName);
			isChannelReady = !doc.isInitiator;

			if (doc.isInitiator) {
				console.log("You created the room.");
			} else {
				console.log("You have joined an existing room.");
			}
/*
getUserMedia sem sem prestavil iz click handlerja 
*/
			getUserMedia.call(navigator, {video: true}, handleUserMedia, handleError);
		});
		socket.on("peer joined room", function() { console.log("Peer joined this room.");
			isChannelReady = true;
		});


		socket.emit('roomName', userName, roomName);
		$modal.modal('toggle');
	}

	var handleIceCandidate = function(event) {
		if (event.candidate) {
			socket.emit('message', {
				type: 'candidate',
				label: event.candidate.sdpMLineIndex,
				id: event.candidate.sdpMip,
				candidate: event.candidate.candidate
			});
		} else {
			console.log("End of candidates.");
		}
	};

	var handleUserMedia = function(stream) {
		// play the stream on the smaller <video>
		console.log("Adding local stream");
		var video = $container.find("#home-video")[0];
		video.src = window.URL.createObjectURL(stream);
		localStream = stream;
		video.play();

		if (isInitiator) {
			maybeStart();
		}
	};

	var handleRemoteStreamAdded = function(event) {
		var video = $("#away-video")[0];
		video.src = window.URL.createObjectURL(event.stream);
		remoteStream = event.stream;
		video.play();
	};

	var handleError = function(error) {
		console.log(error);
	}

	function setLocalAndSendMessage(sessionDescription) {
		pc.setLocalDescription(sessionDescription);
		socket.emit('message', sessionDescription);
	}

	var maybeStart = function() {
		if (!isStarted && typeof localStream != "undefined" && isChannelReady) {

			pc = new webkitRTCPeerConnection(null);
			pc.onicecandidate = handleIceCandidate;
			pc.onaddstream = handleRemoteStreamAdded;
			// pc.onremovestream = ...
			pc.addStream(localStream);
			isStarted = true;

			if (isInitiator) {
				pc.createOffer(setLocalAndSendMessage, handleError);
			}
		}
	};

	socket.on("message to peers", function(message) {
		console.log(message);

		if (message === 'got user media') {
			maybeStart();
		} else if (message.type === 'offer') {
			if (!isInitiator && !isStarted) {
				maybeStart();
			}
			pc.setRemoteDescription(new RTCSessionDescription(message));
			pc.createAnswer(setLocalAndSendMessage, null, sdpConfig);

		} else if (message.type === 'answer' && isStarted) {
			pc.setRemoteDescription(new RTCSessionDescription(message));
		} else if (message.type === 'candidate' && isStarted) {
			var candidate = new RTCIceCandidate({
			  sdpMLineIndex: message.label,
			  candidate: message.candidate
			});
			pc.addIceCandidate(candidate);
		} else if (message === 'bye' && isStarted) {
			//handleRemoteHangup();
		}
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
/*
	Prestavi to takoj za joinanje rooma.
	

	"Kdo je initiator" logika bo morda drugačna.


	1. joinaš roomu

	2. potrdiš get user media
		(kako se bo spremenil maybeStart() v spodnjemu callbacku?)
	3. klikneš na start video call
*/
	});
}());