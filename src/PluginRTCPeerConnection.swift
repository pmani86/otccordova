import Foundation


class PluginRTCPeerConnection : NSObject, RTCPeerConnectionDelegate {
	var rtcPeerConnectionFactory: RTCPeerConnectionFactory
	var rtcPeerConnection: RTCPeerConnection!
	var pluginRTCPeerConnectionConfig: PluginRTCPeerConnectionConfig
	var pluginRTCPeerConnectionConstraints: PluginRTCPeerConnectionConstraints
	// PluginRTCDataChannel dictionary.
	var pluginRTCDataChannels: [Int : PluginRTCDataChannel] = [:]
	// PluginRTCDTMFSender dictionary.
	//var pluginRTCDTMFSenders: [Int : PluginRTCDTMFSender] = [:]
    var eventListener: (_ data: NSDictionary) -> Void
	var eventListenerForAddStream: (_ pluginMediaStream: PluginMediaStream) -> Void
	var eventListenerForRemoveStream: (_ id: String) -> Void
	var onCreateDescriptionSuccessCallback: ((_ rtcSessionDescription: RTCSessionDescription) -> Void)!
	var onCreateDescriptionFailureCallback: ((_ error: NSError) -> Void)!
	var onSetDescriptionSuccessCallback: (() -> Void)!
	var onSetDescriptionFailureCallback: ((_ error: NSError) -> Void)!


	init(
		rtcPeerConnectionFactory: RTCPeerConnectionFactory,
		pcConfig: NSDictionary?,
		pcConstraints: NSDictionary?,
		eventListener: @escaping (_ data: NSDictionary) -> Void,
		eventListenerForAddStream: @escaping (_ pluginMediaStream: PluginMediaStream) -> Void,
		eventListenerForRemoveStream: @escaping (_ id: String) -> Void
	) {
		NSLog("PluginRTCPeerConnection#init()")

		self.rtcPeerConnectionFactory = rtcPeerConnectionFactory
		self.pluginRTCPeerConnectionConfig = PluginRTCPeerConnectionConfig(pcConfig: pcConfig)
		self.pluginRTCPeerConnectionConstraints = PluginRTCPeerConnectionConstraints(pcConstraints: pcConstraints)
		self.eventListener = eventListener
		self.eventListenerForAddStream = eventListenerForAddStream
		self.eventListenerForRemoveStream = eventListenerForRemoveStream
	}


	deinit {
		NSLog("PluginRTCPeerConnection#deinit()")
		//self.pluginRTCDTMFSenders = [:]
	}


	func run() {
		NSLog("PluginRTCPeerConnection#run()")

        let rtcConfig: RTCConfiguration = RTCConfiguration()
        rtcConfig.bundlePolicy = RTCBundlePolicy.maxCompat
        rtcConfig.iceServers = self.pluginRTCPeerConnectionConfig.getIceServers()

		self.rtcPeerConnection = self.rtcPeerConnectionFactory.peerConnection(
			with: rtcConfig,
			constraints: self.pluginRTCPeerConnectionConstraints.getConstraints(),
			delegate: self
		)
	}


	func createOffer(
		_ options: NSDictionary?,
		callback: @escaping (_ data: NSDictionary) -> Void,
		errback: @escaping (_ error: NSError) -> Void
	) {
		NSLog("PluginRTCPeerConnection#createOffer()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCPeerConnectionConstraints = PluginRTCPeerConnectionConstraints(pcConstraints: options)

		self.onCreateDescriptionSuccessCallback = { (rtcSessionDescription: RTCSessionDescription) -> Void in
			NSLog("PluginRTCPeerConnection#createOffer() | success callback")

            print("rtcSessionDescription: \(rtcSessionDescription.type.rawValue)")
            let data : NSDictionary = [
				"type": RTCSessionDescription.string(for: rtcSessionDescription.type),
				"sdp": rtcSessionDescription.sdp
			]
            //FIXME:NSDictionary takes AnyObject

			callback(data)
		}

		self.onCreateDescriptionFailureCallback = { (error: NSError) -> Void in
			NSLog("PluginRTCPeerConnection#createOffer() | failure callback: %@", String(describing: error))

			errback(error)
		}

		self.rtcPeerConnection.offer(for: pluginRTCPeerConnectionConstraints.getConstraints(), completionHandler: createDescriptionHandler as! (RTCSessionDescription?, Error?) -> Void)
    }

    func createDescriptionHandler(
        _ rtcSessionDescription: RTCSessionDescription?,
        error: Error?
    ) {
        if error == nil {
            //FIXME: Check the sdp isn't nill maybe
            self.onCreateDescriptionSuccessCallback(rtcSessionDescription!)
        } else {
            self.onCreateDescriptionFailureCallback(error! as NSError)
        }
    }


	func createAnswer(
		_ options: NSDictionary?,
		callback: @escaping (_ data: NSDictionary) -> Void,
		errback: @escaping (_ error: NSError) -> Void
	) {
		NSLog("PluginRTCPeerConnection#createAnswer()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCPeerConnectionConstraints = PluginRTCPeerConnectionConstraints(pcConstraints: options)

		self.onCreateDescriptionSuccessCallback = { (rtcSessionDescription: RTCSessionDescription) -> Void in
			NSLog("PluginRTCPeerConnection#createAnswer() | success callback")

            let data : NSDictionary = [
				"type": RTCSessionDescription.string(for: rtcSessionDescription.type),
				"sdp": rtcSessionDescription.sdp
			]

            //FIXME:NSDictionary takes AnyObject
			callback(data)
		}

		self.onCreateDescriptionFailureCallback = { (error: NSError) -> Void in
			NSLog("PluginRTCPeerConnection#createAnswer() | failure callback: %@", String(describing: error))

			errback(error)
		}

        self.rtcPeerConnection.answer(for: pluginRTCPeerConnectionConstraints.getConstraints(), completionHandler: createDescriptionHandler as! (RTCSessionDescription?, Error?) -> Void)
    }

    func setDescriptionHandler(
        _ error: Error?
        ) {
        if error == nil {
            //FIXME: Check the sdp isn't nill maybe
            self.onSetDescriptionSuccessCallback()
        } else {
            self.onSetDescriptionFailureCallback(error! as NSError)
        }
    }


	func setLocalDescription(
		_ desc: NSDictionary,
		callback: @escaping (_ data: NSDictionary) -> Void,
		errback: @escaping (_ error: NSError) -> Void
	) {
		NSLog("PluginRTCPeerConnection#setLocalDescription()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

        //FIXME: Check for nill
		let type = desc.object(forKey: "type") as? String ?? ""
        print("Type is \(type)")
		let sdp = desc.object(forKey: "sdp") as? String ?? ""
        let rtcType : RTCSdpType = RTCSessionDescription.type(for: type)
        print("Setting RTCSDPType to \(rtcType.rawValue)")
		let rtcSessionDescription = RTCSessionDescription(type: rtcType, sdp: sdp)

		self.onSetDescriptionSuccessCallback = { [unowned self] () -> Void in
			NSLog("PluginRTCPeerConnection#setLocalDescription() | success callback")

            //FIXME:NSDictionary takes AnyObject
            let data : NSDictionary = [
				"type": RTCSessionDescription.string(for: self.rtcPeerConnection.localDescription!.type),
				"sdp": self.rtcPeerConnection.localDescription!.sdp
			]

			callback(data)
		}

		self.onSetDescriptionFailureCallback = { (error: NSError) -> Void in
			NSLog("PluginRTCPeerConnection#setLocalDescription() | failure callback: %@", String(describing: error))

			errback(error)
		}

        print("DARIUS rtCSessionDescription \(rtcSessionDescription)")

		self.rtcPeerConnection.setLocalDescription(rtcSessionDescription, completionHandler: setDescriptionHandler as! (Error?) -> Void)
	}

	func setRemoteDescription(
		_ desc: NSDictionary,
		callback: @escaping (_ data: NSDictionary) -> Void,
		errback: @escaping (_ error: NSError) -> Void
	) {
		NSLog("PluginRTCPeerConnection#setRemoteDescription()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

        //FIXME: Check for nill
        let type = RTCSessionDescription.type(for: (desc.object(forKey: "type") as? String ?? ""))
        let sdp = desc.object(forKey: "sdp") as? String ?? ""

        print("\n\nDARIUS LOG sdp: \(sdp)\n\n")

        let rtcSessionDescription = RTCSessionDescription(type: type, sdp: sdp)

		self.onSetDescriptionSuccessCallback = { [unowned self] () -> Void in
			NSLog("PluginRTCPeerConnection#setRemoteDescription() | success callback")

            //FIXME:NSDictionary takes AnyObject
            let data : NSDictionary = [
                "type": RTCSessionDescription.string(for: self.rtcPeerConnection.localDescription!.type),
                "sdp": self.rtcPeerConnection.localDescription!.sdp
            ]

			callback(data)
		}

		self.onSetDescriptionFailureCallback = { (error: NSError) -> Void in
			NSLog("PluginRTCPeerConnection#setRemoteDescription() | failure callback: %@", String(describing: error))

			errback(error)
		}

		self.rtcPeerConnection.setRemoteDescription(rtcSessionDescription, completionHandler: setDescriptionHandler as! (Error?) -> Void)
	}


	func addIceCandidate(
		_ candidate: NSDictionary,
		callback: (_ data: NSDictionary) -> Void,
		errback: () -> Void
	) {
		NSLog("PluginRTCPeerConnection#addIceCandidate()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let sdpMid = candidate.object(forKey: "sdpMid") as? String ?? ""
		let sdpMLineIndex = candidate.object(forKey: "sdpMLineIndex") as? Int32 ?? 0
		let candidate = candidate.object(forKey: "candidate") as? String ?? ""

		self.rtcPeerConnection.add(RTCIceCandidate(
            sdp: candidate,
            sdpMLineIndex: sdpMLineIndex,
            sdpMid: sdpMid
		))

        var data: NSDictionary

        //FIXME: Used to check if addIce was successful, no longer possible
			if self.rtcPeerConnection.remoteDescription != nil {
                //FIXME: More dictionary problems
				data = [
					"remoteDescription": [
						"type": self.rtcPeerConnection.remoteDescription!.type as AnyObject,
						"sdp": self.rtcPeerConnection.remoteDescription!.sdp
					]
				]
			} else {
				data = [
					"remoteDescription": false
				]
			}

			callback(data)
	}


	func addStream(_ pluginMediaStream: PluginMediaStream) -> Bool {
		NSLog("PluginRTCPeerConnection#addStream()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
            return false
		}
        //FIXME: Used to return bool
		self.rtcPeerConnection.add(pluginMediaStream.rtcMediaStream)
        return true
	}


	func removeStream(_ pluginMediaStream: PluginMediaStream) {
		NSLog("PluginRTCPeerConnection#removeStream()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		self.rtcPeerConnection.remove(pluginMediaStream.rtcMediaStream)
	}


	func createDataChannel(
		_ dcId: Int,
		label: String,
		options: NSDictionary?,
		eventListener: @escaping (_ data: NSDictionary) -> Void,
		eventListenerForBinaryMessage: @escaping (_ data: Data) -> Void
	) {
		NSLog("PluginRTCPeerConnection#createDataChannel()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCDataChannel = PluginRTCDataChannel(
			rtcPeerConnection: rtcPeerConnection,
			label: label,
			options: options,
			eventListener: eventListener,
			eventListenerForBinaryMessage: eventListenerForBinaryMessage
		)

		// Store the pluginRTCDataChannel into the dictionary.
		self.pluginRTCDataChannels[dcId] = pluginRTCDataChannel

		// Run it.
		pluginRTCDataChannel.run()
	}


	func RTCDataChannel_setListener(
		_ dcId: Int,
		eventListener: @escaping (_ data: NSDictionary) -> Void,
		eventListenerForBinaryMessage: @escaping (_ data: Data) -> Void
	) {
		NSLog("PluginRTCPeerConnection#RTCDataChannel_setListener()")

		let pluginRTCDataChannel = self.pluginRTCDataChannels[dcId]

		if pluginRTCDataChannel == nil {
			return;
		}

		// Set the eventListener.
		pluginRTCDataChannel!.setListener(eventListener,
			eventListenerForBinaryMessage: eventListenerForBinaryMessage
		)
	}


	func createDTMFSender(
		_ dsId: Int,
		track: PluginMediaStreamTrack,
		eventListener: (_ data: NSDictionary) -> Void
	) {
		NSLog("PluginRTCPeerConnection#createDTMFSender()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		/*let pluginRTCDTMFSender = PluginRTCDTMFSender(
			rtcPeerConnection: rtcPeerConnection,
			track: track.rtcMediaStreamTrack,
			eventListener: eventListener
		)*/

		// Store the pluginRTCDTMFSender into the dictionary.
		//self.pluginRTCDTMFSenders[dsId] = pluginRTCDTMFSender

		// Run it.
		//pluginRTCDTMFSender.run()
	}


	func close() {
		NSLog("PluginRTCPeerConnection#close()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		self.rtcPeerConnection.close()
	}


	func RTCDataChannel_sendString(
		_ dcId: Int,
		data: String,
		callback: (_ data: NSDictionary) -> Void
	) {
		NSLog("PluginRTCPeerConnection#RTCDataChannel_sendString()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCDataChannel = self.pluginRTCDataChannels[dcId]

		if pluginRTCDataChannel == nil {
			return;
		}

		pluginRTCDataChannel!.sendString(data, callback: callback)
	}


	func RTCDataChannel_sendBinary(
		_ dcId: Int,
		data: Data,
		callback: (_ data: NSDictionary) -> Void
	) {
		NSLog("PluginRTCPeerConnection#RTCDataChannel_sendBinary()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCDataChannel = self.pluginRTCDataChannels[dcId]

		if pluginRTCDataChannel == nil {
			return;
		}

		pluginRTCDataChannel!.sendBinary(data, callback: callback)
	}


	func RTCDataChannel_close(_ dcId: Int) {
		NSLog("PluginRTCPeerConnection#RTCDataChannel_close()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		let pluginRTCDataChannel = self.pluginRTCDataChannels[dcId]

		if pluginRTCDataChannel == nil {
			return;
		}

		pluginRTCDataChannel!.close()

		// Remove the pluginRTCDataChannel from the dictionary.
		self.pluginRTCDataChannels[dcId] = nil
	}


	func RTCDTMFSender_insertDTMF(
		_ dsId: Int,
		tones: String,
		duration: Int,
		interToneGap: Int
	) {
		NSLog("PluginRTCPeerConnection#RTCDTMFSender_insertDTMF()")

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		/*let pluginRTCDTMFSender = self.pluginRTCDTMFSenders[dsId]
		if pluginRTCDTMFSender == nil {
			return
		}

		pluginRTCDTMFSender!.insertDTMF(tones, duration: duration, interToneGap: interToneGap)*/
	}


	/**
	 * Methods inherited from RTCPeerConnectionDelegate.
	 */


	func peerConnection(_ peerConnection: RTCPeerConnection,
		didChange stateChanged: RTCSignalingState) {
		let state_str = PluginRTCTypes.signalingStates[stateChanged.rawValue] as String!

		NSLog("PluginRTCPeerConnection | onsignalingstatechange [signalingState:%@]", String(describing: state_str))

        self.eventListener([
            "type": "signalingstatechange",
            "signalingState": state_str
        ])
	}


	func peerConnection(_ peerConnection: RTCPeerConnection,
		didChange newState: RTCIceGatheringState) {
		let state_str = PluginRTCTypes.iceGatheringStates[newState.rawValue] as String!

		NSLog("PluginRTCPeerConnection | onicegatheringstatechange [iceGatheringState:%@]", String(describing: state_str))

		self.eventListener([
			"type": "icegatheringstatechange",
			"iceGatheringState": state_str
		])

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

		// Emit an empty candidate if iceGatheringState is "complete".
		if newState.rawValue == RTCIceGatheringState.complete.rawValue && self.rtcPeerConnection.localDescription != nil {
            //FIXME: Another dictionary bork
            let subDict : NSDictionary = [
                "type": RTCSessionDescription.string(for: self.rtcPeerConnection.localDescription!.type),
                "sdp": self.rtcPeerConnection.localDescription!.sdp
            ]
			self.eventListener([
				"type": "icecandidate",
				// NOTE: Cannot set null as value.
				"candidate": false,
                "localDescription": subDict
			])
		}
	}


	func peerConnection(_ peerConnection: RTCPeerConnection,
		didGenerate candidate: RTCIceCandidate) {
		NSLog("PluginRTCPeerConnection | onicecandidate [sdpMid:%@, sdpMLineIndex:%@, candidate:%@]",
			String(describing: candidate.sdpMid), String(candidate.sdpMLineIndex), String(candidate.sdp))

		if self.rtcPeerConnection.signalingState.rawValue == RTCSignalingState.closed.rawValue {
			return
		}

        let subDict : NSDictionary = [
            "sdpMid": candidate.sdpMid!,
            "sdpMLineIndex": NSNumber(value: candidate.sdpMLineIndex as Int32),
            "candidate": candidate.sdp
        ]

        let subDict2 : NSDictionary = [
        "type": RTCSessionDescription.string(for: self.rtcPeerConnection.localDescription!.type),
        "sdp": self.rtcPeerConnection.localDescription!.sdp
        ]

        //FIXME: Dictionary shit again
		self.eventListener([
			"type": "icecandidate",
			"candidate": subDict,
            "localDescription": subDict2
		])
	}

    func peerConnection(_ peerConnection: RTCPeerConnection,
        didRemove candidates: [RTCIceCandidate]) {
        NSLog("PluginRTCPeerConnection | onicecandidateremoved")

    }

	func peerConnection(_ peerConnection: RTCPeerConnection,
		didChange newState: RTCIceConnectionState) {
		let state_str = PluginRTCTypes.iceConnectionStates[newState.rawValue] as String!

		NSLog("PluginRTCPeerConnection | oniceconnectionstatechange [iceConnectionState:%@]", String(describing: state_str))

		self.eventListener([
			"type": "iceconnectionstatechange",
			"iceConnectionState": state_str
		])
	}


	func peerConnection(_ rtcPeerConnection: RTCPeerConnection,
		didAdd rtcMediaStream: RTCMediaStream) {
		NSLog("PluginRTCPeerConnection | onaddstream")

		let pluginMediaStream = PluginMediaStream(rtcMediaStream: rtcMediaStream, rtcVideoSource: nil)

		pluginMediaStream.run()

		// Let the plugin store it in its dictionary.
		self.eventListenerForAddStream(pluginMediaStream)

		// Fire the 'addstream' event so the JS will create a new MediaStream.
		self.eventListener([
			"type": "addstream",
			"stream": pluginMediaStream.getJSON()
		])
	}


	func peerConnection(_ rtcPeerConnection: RTCPeerConnection,
		didRemove rtcMediaStream: RTCMediaStream) {
		NSLog("PluginRTCPeerConnection | onremovestream")

		// Let the plugin remove it from its dictionary.
		self.eventListenerForRemoveStream(rtcMediaStream.streamId)

		self.eventListener([
			"type": "removestream",
			"streamId": rtcMediaStream.streamId  // NOTE: No "id" property yet.
		])
	}


	func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
		NSLog("PluginRTCPeerConnection | onnegotiationeeded")

		self.eventListener([
			"type": "negotiationneeded"
		])
	}


	func peerConnection(_ peerConnection: RTCPeerConnection,
		didOpen dataChannel: RTCDataChannel) {
		NSLog("PluginRTCPeerConnection | ondatachannel")

		let dcId = PluginUtils.randomInt(10000, max:99999)
		let pluginRTCDataChannel = PluginRTCDataChannel(
			rtcDataChannel: dataChannel
		)

		// Store the pluginRTCDataChannel into the dictionary.
		self.pluginRTCDataChannels[dcId] = pluginRTCDataChannel

		// Run it.
		pluginRTCDataChannel.run()

		// Fire the 'datachannel' event so the JS will create a new RTCDataChannel.
        //FIXME: More dictionary bullshit
        let subDict : NSDictionary = [
            "dcId": dcId,
            "label": dataChannel.label,
            "ordered": dataChannel.isOrdered,
            "maxPacketLifeTime": NSNumber(value: dataChannel.maxPacketLifeTime as UInt16),
            "maxRetransmits": NSNumber(value: dataChannel.maxRetransmits as UInt16),
            "protocol": dataChannel.`protocol`,
            "negotiated": dataChannel.isNegotiated,
            "id": NSNumber(value: dataChannel.channelId as Int32),
            "readyState": PluginRTCTypes.dataChannelStates[dataChannel.readyState.rawValue] as String!,
            "bufferedAmount": NSNumber(value: dataChannel.bufferedAmount as UInt64)
        ]

		self.eventListener([
			"type": "datachannel",
			"channel": subDict
		])
	}
}
