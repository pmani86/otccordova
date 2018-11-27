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
	alert(documentIdVideo);
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
	retrun rtc.muteAudio();
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
