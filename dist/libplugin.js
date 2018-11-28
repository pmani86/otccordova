
module.exports = {
	// Expose Library classes and functions.
	testFunction : testFunction,
	connectDom : connectDom,
	initializeDom : initializeDom,
	muteAudio : muteAudio,
	disconnect : finalise,
	sendMessage : sendMessage
};

function testFunction(){
	alert("called");
}
