$.material.init()
var socket = io();

(function() {
	var $navbar = $("body > .navbar");
	var $container = $("body > .container-fluid");
	var $awayVideo = $container.find("#away-video")[0];
	var $homeVideo = $container.find("#home-video")[0];
	var $modal = $container.find("#myModal");
	var $textContainer = $container.find("#text-container");
	var isStarted = false;
	var isInitiator = false;
	var isChannelReady = false;
	var pc;
	var localStream, remoteStream;
	var textChannel;
	var peerName, userName, roomName;
	var getUserMedia = navigator.getUserMedia ||
  			navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	var sdpConfig = {'mandatory': {
		'OfferToReceiveAudio':false,
		'OfferToReceiveVideo':false }
	};

	var servers = {
		'iceServers': [ {url:'stun:stun.l.google.com:19302'},
						{url:'stun:stun1.l.google.com:19302'},
						{url:'stun:stun2.l.google.com:19302'},
						{url:'stun:stun3.l.google.com:19302'},
						{url:'stun:stun4.l.google.com:19302'}]
	};

/********************************** UI stuff ****************************************/

	var insertMessage = function(message, amSender) {
		var html = '<div class="text-chat-line text-chat-' + (amSender ? "sent" : "received") + '">';
		html += '<b>' + (amSender ? userName : peerName) + ': </b> ';
		html += message;
		html += '</div>';
		$container.find(".text-chat").append(html);
	};

	var toggleMute = function(event) {
		$(event.target).toggleClass("active");
		$awayVideo.muted = !$awayVideo.muted;
	};

/********************************** callbacks ****************************************/

	var handleIceCandidate = function(event) {
		if (event.candidate) {
			socket.emit('message', {
				type: 'candidate',
				label: event.candidate.sdpMLineIndex,
				id: event.candidate.sdpMip,
				candidate: event.candidate.candidate
			});
		}
	};

	var handleUserMedia = function(stream) {
		$homeVideo.muted = true;
		$homeVideo.src = window.URL.createObjectURL(stream);
		localStream = stream;
		$homeVideo.play();
	};

	var handleRemoteStreamAdded = function(event) {
		$awayVideo.src = window.URL.createObjectURL(event.stream);
		remoteStream = event.stream;
		$awayVideo.play();
	};

	var handleError = function(error) {
		console.log(error);
	};

	function setLocalAndSendMessage(sessionDescription) {
		pc.setLocalDescription(sessionDescription);
		socket.emit('message', sessionDescription);
	};

/*************************************************************************************/

	var maybeStart = function() {
		if (!isStarted && typeof localStream != "undefined" && isChannelReady) {
			pc = new webkitRTCPeerConnection(servers, {optional: [{RtpDataChannels: true}]});		// {optional: [{RtpDataChannels: true}]}
			pc.onicecandidate = handleIceCandidate;
			pc.onaddstream = handleRemoteStreamAdded;
			pc.addStream(localStream);
			isStarted = true;

			textChannel = pc.createDataChannel("textChat", null);
			textChannel.onerror = handleError;
			textChannel.onmessage = receiveText;

			if (isInitiator) {
				pc.createOffer(setLocalAndSendMessage, handleError);
			}
		}
	};

	socket.on("message to peers", function(message) {
		if (message.type === 'offer') {
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
		} else if (message.type == "closeConnection") {
			pc.close();
			isChannelReady = false;
		}
	});

	var joinRoom = function() {
		userName = $container.find("#myModal #userNameInput").val();
		roomName = $container.find("#myModal #roomNameInput").val();

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
			peerName = doc.peerName;
			isInitiator = doc.isInitiator;
			$container.find("div.room-name").append(doc.roomName);
			isChannelReady = !doc.isInitiator;

			if (doc.isInitiator) {
				$container.find("#makeCall").prop("disabled", false);
				console.log("You created the room.");
			} else {
				console.log("You have joined an existing room.");
			}

			getUserMedia.call(navigator, {video: true, audio: true}, handleUserMedia, handleError);
		});
		socket.on("peer joined room", function(doc) { console.log("Peer joined this room.");
			isChannelReady = true;
			peerName = doc.peerName;
		});


		socket.emit('roomName', userName, roomName);
		$modal.modal('toggle');
		
		// Unbind Enter key used for the form
		$(document).unbind("keypress.key13");

		$(document).bind("keypress.key13", function(e) {
		    if(e.which == 13) {
		        sendText();
		    }
		});	
	}

	var leaveRoom = function() {
		socket.emit("message", {type: "closeConnection"});
		setTimeout(function() { pc.close(); }, 500);
		isChannelReady = false;
		socket.emit("leaveRoom");
	};

	var receiveText = function(event) {
		var message = event.data;
		insertMessage(message, false);
	};

	var sendText = function() {
		if (!isChannelReady) return;

		var text = $textContainer.val();
		if (!text) return;
		
		$textContainer.val("");

		textChannel.send(text);
		insertMessage(text, true);
	};

	$container.find("#makeCall").click(function() {
		if (isInitiator) {
			maybeStart();
		}
	});

	$container.find("#send-text").click(sendText);

	$navbar.find("#mute-audio").click(toggleMute);

	$navbar.find("#leave-room").click(leaveRoom);

	setTimeout(function() {
		$container.find("#myModal").modal();
		$container.find("#myModal button").click(joinRoom);

		$(document).bind("keypress.key13", function(e) {
		    if(e.which == 13) {
		        joinRoom();
		    }
		});
	}, 1000);
}());