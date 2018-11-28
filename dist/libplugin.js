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

module.exports = {
	// Expose Library classes and functions.
	testFunction : testFunction,
	connectDom : connectDom,
	initializeDom : initializeDom,
	muteAudio : muteAudio,
	disconnect : finalise,
	sendMessage : sendMessage
};

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
		
	 var node = document.createElement("script"), 
		okHandler,
		errHandler;
		
	node.src = "https://webmeet.fvc.com/static/webrtc/js/pexrtc.js";

	okHandler = function () {
		this.removeEventListener("load", okHandler);
		this.removeEventListener("error", errHandler);
		PexLoad(documentIdVideo, documentIdSelf);
	};
	errHandler = function (error) {
		this.removeEventListener("load", okHandler);
		this.removeEventListener("error", errHandler);
		console.log("Error loading script: " + path);
	};

	node.addEventListener("load", okHandler);
	node.addEventListener("error", errHandler);

	document.head.appendChild(node);
		
	alert('test2');
	console.log("Plugin Initialized");
}

function PexLoad(documentIdVideo, documentIdSelf){
	alert('PexLoad test');
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
alert('PexLoad END'); 	
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
