var rtc;
var bandwidth;
var pin;
var video;
var conference;
var node;
var permissions;
var flash;
var presentation = null;
var flash_button = null;
var presWidth = 1280;
var presHeight = 720;
var presenter;
var source = null;
var presenting = false;
var startTime = null;
var userResized = false;
var presentationURL = '';
var videoPresentation = true;
var selfView;
var vidyoConnector;

module.exports = {
	// Expose Library classes and functions.
	testFunction : testFunction,
	connectDom : connectDom,
	initializeDom : initializeDom,
	muteAudio : muteAudio,
	disconnect : finalise,
	sendMessage : sendMessage,
	initializeVidyo : initializeVidyo,
	connectVidyo : connectVidyo
};

function onVidyoClientLoaded(status) {
	alert("VidyoClient load state - " + status.state);
	
	if (status.state == "READY") {
		VC.CreateVidyoConnector({
			viewId: "renderer", // Div ID where the composited video will be rendered, see VidyoConnector.html;
			viewStyle: "VIDYO_CONNECTORVIEWSTYLE_Default", // Visual style of the composited renderer
			remoteParticipants: 5, // Maximum number of participants to render
			logFileFilter: "error",
			logFileName: "",
			userData: ""
		}).then(function (vc) {
			console.log("Create success");
			vidyoConnector = vc;
		}).catch(function (error) {

		});
	}
	alert(vidyoConnector);
}

function connectVidyo(genToken, user, room) {
	alert('connectVidyo');
	vidyoConnector.Connect({
		host: "prod.vidyo.io",
		token: genToken,
		displayName: user,
		resourceId: room,
		// Define handlers for connection events.
		onSuccess: function () {
			console.log("Intiailized");
		},
		onFailure: function (reason) {/* Failed */ },
		onDisconnected: function (reason) {/* Disconnected */ }
	}).then(function (status) {
		if (status) {
			console.log("ConnectCall Success");
		} else {
			console.error("ConnectCall Failed");
		}
	}).catch(function () {
		console.error("ConnectCall Failed");
	});
	alert('connectVidyo2');
}


function initializeVidyo(srcScript){
	var pexrtc_script = document.createElement('script');
		pexrtc_script.type = 'text/javascript';
		pexrtc_script.async = false;
		pexrtc_script.src = srcScript;
		pexrtc_script.onload = onVidyoClientLoaded;
		document.body.appendChild(pexrtc_script);
	
	alert("Video Plugin Initialized");
}
function initializeDom(documentIdVideo, documentIdSelf, deviceType){
	console.log('Initialize Called');
	if (deviceType === 'iOS') {
			cordova.plugins.iosrtc.registerGlobals();
			console.log('xxx registered globals');
		} else {
			permissions = cordova.plugins.permissions;
			permissions.requestPermission(permissions.CAMERA, success, error);
			permissions.requestPermission(permissions.RECORD_AUDIO, success, error);
		}
		
		var pexrtc_script = document.createElement('script');
		pexrtc_script.type = 'text/javascript';
		pexrtc_script.async = false;
		pexrtc_script.src = 'https://webmeet.fvc.com/static/webrtc/js/pexrtc.js';
		
		pexrtc_script.onload = function() {
			rtc = new PexRTC();
			video = document.getElementById(documentIdVideo);
			selfView = document.getElementById(documentIdSelf);

			//document.addEventListener('beforeunload', finalise);

			rtc.onSetup = doneSetup;
			console.log('doneSetup is a:', doneSetup);
			rtc.onConnect = connected;
			rtc.onError = remoteDisconnect;
			rtc.onDisconnect = remoteDisconnect;
			rtc.onParticipantCreate = participantCreate;
			rtc.onParticipantDelete = participantDelete;  		
		};
		
	document.head.appendChild(pexrtc_script);
	
	console.log("Plugin Initialized");
}

function connectDom(conferenceValue, nodeValue, pinValue, bandwidthValue) {
	node = nodeValue;
	conference = conferenceValue;
	pin = pinValue;
	bandwidth = bandwidthValue;
	
	rtc.makeCall(node, conference, pin, bandwidth);
	// don't refresh the page here
	return false;
}

function doneSetup(videoURL, pin_status) {
	console.log('doneSetup with pin_status and pin: ', pin_status, pin);
	if (typeof(MediaStream) !== "undefined" && videoURL instanceof MediaStream) {
		selfView.srcObject = videoURL;  
	} else {
		selfView.src = videoURL;
	}
	
	rtc.connect(pin);
}

function connected(videoURL) {
	video.poster = "";
	 if (typeof(MediaStream) !== "undefined" && videoURL instanceof MediaStream) {
		 video.srcObject = videoURL;  
	 } else {
		video.src = videoURL;
	}
	console.log('connected');
}

function muteAudio(){
	return rtc.muteAudio();
}

function remoteDisconnect() {
	console.log('remote disconnect');
}

function finalise() {
	console.log('finalise');
	rtc.disconnect();
	video.src = "";
}

function error() {
  console.log('Missing permissions');
}

function success( status ) {
  if( !status.hasPermission ) error();
}

function participantCreate(documnetId, participant) {
	console.log('participant created: ', participant);
	var newParticipant = document.createElement('li')
	newParticipant.id = participant.uuid;
	newParticipant.appendChild(document.createTextNode(participant.display_name));
	document.getElementById(documnetId).appendChild(newParticipant);
}

function participantDelete(documnetId, participant) {
	console.log('participant deleted: ', participant);
	var toRemove = document.getElementById(participant.uuid);
	document.getElementById(documnetId).removeChild(toRemove);
}

function sendMessage(message){
	rtc.sendChatMessage(message);
}

function messageRecived(documentId, message){
	document.getElementById(documentId).value = message;
}

function presentationClosed() {
    id_presentation.textContent = trans['BUTTON_SHOWPRES'];
    if (presentation) {
        rtc.stopPresentation();
    }
    presentation = null;
}

function remotePresentationClosed(reason) {
    if (presentation) {
        if (reason) {
            return reason;
        }
        presentation.close()
    }
}

function testFunction(){
	alert("called");
}
