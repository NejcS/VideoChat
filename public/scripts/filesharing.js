$.material.init()
var socket = io();

(function() {
	var $navbar = $("body > .navbar");
	var $container = $("body > .container-fluid");
	var $modal = $container.find("#myModal");
	var isStarted = false;
	var isInitiator = false;
	var isChannelReady = false;
	var pc;
	var textChannel;
	var fileChannel;
	var peerName, userName, roomName;
	var fileProperties;
	var receivedStack = [];
	var receivedSize = 0;
	var getUserMedia = navigator.getUserMedia ||
  			navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	var sdpConfig = {'mandatory': {
		'OfferToReceiveAudio':false,
		'OfferToReceiveVideo':false }
	};

	var fileChannelConfig = {
		ordered: true
	};

/********************************** UI stuff ****************************************/

	var insertMessage = function(message, amSender) {
		var html = '<div class="text-chat-line text-chat-' + (amSender ? "sent" : "received") + '">';
		html += '<b>' + (amSender ? userName : peerName) + ': </b> ';
		html += message;
		html += '</div>';
		$container.find(".text-chat").append(html);
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

	var handleError = function(error) { console.log(error); };

	function setLocalAndSendMessage(sessionDescription) {
		pc.setLocalDescription(sessionDescription);
		socket.emit('message', sessionDescription);
	};

/*************************************************************************************/

	var maybeStart = function() {
		if (!isStarted && isChannelReady) {
			pc = new webkitRTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});		// {optional: [{RtpDataChannels: true}]}
			pc.onicecandidate = handleIceCandidate;
			isStarted = true;

			textChannel = pc.createDataChannel("textChat", null);
			textChannel.onerror = handleError;
			textChannel.onmessage = receiveText;

			fileChannel = pc.createDataChannel("fileTransfer", {reliable: true});
			fileChannel.binaryType = 'arraybuffer';
			fileChannel.onmessage = receiveFile;
			fileChannel.onerror = handleError;

			if (isInitiator) {
				pc.createOffer(setLocalAndSendMessage, handleError);
			}
		}
	};

	socket.on("message to peers", function(message) {
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
		});
		socket.on("peer joined room", function(doc) { console.log("Peer joined this room.");
			isChannelReady = true;
			peerName = doc.peerName;
			maybeStart();
		});


		socket.emit('roomName', userName, roomName);
		$modal.modal('toggle');
		// Unbind Enter key used for the form
		$(document).unbind("keypress.key13");
	}

	var transferFile = function() {
		var file = document.getElementById('file-selector').files[0];
		textChannel.send('-.-.-.-' + JSON.stringify({size: file.size, name: file.name}));
		
		var reader = new window.FileReader();
		var chunkSize = 750;

		function onReadAsDataURL(event, text) {
		    var data = {};

		    if (event) {
		    	// save the text on first call
		    	text = event.target.result;
		    }

		    if (text.length > chunkSize) {
		        data.message = text.slice(0, chunkSize); // getting chunk using predefined chunk length
		    } else {
		        data.message = text;
		        data.last = true;
		    }

		    fileChannel.send(JSON.stringify(data));

		    var remainingDataURL = text.slice(data.message.length);
		    
		    if (remainingDataURL.length) {
		    	setTimeout(function () {
			        onReadAsDataURL(null, remainingDataURL); // continue transmitting
			    }, 500);
			}
		}
		reader.onload = onReadAsDataURL;
		reader.readAsDataURL(file);
	};

	var receiveFile = function(event) {
		var data = JSON.parse(event.data);

	    receivedStack.push(data.message);

	    if (data.last) {
	        saveToDisk(receivedStack.join(''), fileProperties.name);
	        receivedStack = [];
	    }
	};

	var saveToDisk = function(fileUrl, fileName) {
	    var save = document.createElement('a');
	    save.href = fileUrl;
	    save.target = '_blank';
	    save.download = fileName || fileUrl;

	    var event = document.createEvent('Event');
	    event.initEvent('click', true, true);

	    save.dispatchEvent(event);
	    (window.URL || window.webkitURL).revokeObjectURL(save.href);
	};


	var receiveText = function(event) {		
		if (event.data.slice(0, 7) === '-.-.-.-') {
			var serializedObject = event.data.slice(7);
			fileProperties = JSON.parse(serializedObject);
			var message = "Started transfering file " + fileProperties.name;
		} else {
			var message = event.data;
		}

		insertMessage(message, false);
	};

	setTimeout(function() {
		$container.find("#myModal").modal();
		$container.find("#myModal button").click(joinRoom);

		$(document).bind("keypress.key13", function(e) {
		    if(e.which == 13) {
		        joinRoom();
		    }
		});
	}, 1000);	

	$container.find("#sendFile").click(transferFile);

	$container.find("#send-text").click(function() {
		var text = $container.find("#text-container").val();
		textChannel.send(text);
		insertMessage(text, true);
	});
}());