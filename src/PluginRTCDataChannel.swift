import Foundation


class PluginRTCDataChannel : NSObject, RTCDataChannelDelegate {
	var rtcDataChannel: RTCDataChannel?
	var eventListener: ((_ data: NSDictionary) -> Void)?
	var eventListenerForBinaryMessage: ((_ data: Data) -> Void)?
	var lostStates = Array<String>()
	var lostMessages = Array<RTCDataBuffer>()


	/**
	 * Constructor for pc.createDataChannel().
	 */
	init(
		rtcPeerConnection: RTCPeerConnection,
		label: String,
		options: NSDictionary?,
		eventListener: @escaping (_ data: NSDictionary) -> Void,
		eventListenerForBinaryMessage: @escaping (_ data: Data) -> Void
	) {
		NSLog("PluginRTCDataChannel#init()")

		self.eventListener = eventListener
		self.eventListenerForBinaryMessage = eventListenerForBinaryMessage

		let rtcDataChannelConfiguration = RTCDataChannelConfiguration()

		if options?.object(forKey: "ordered") != nil {
			rtcDataChannelConfiguration.isOrdered = options!.object(forKey: "ordered") as! Bool
		}

		if options?.object(forKey: "maxPacketLifeTime") != nil {
			// TODO: rtcDataChannel.maxRetransmitTime always reports 0.
			rtcDataChannelConfiguration.maxPacketLifeTime = options!.object(forKey: "maxPacketLifeTime") as! Int32
		}

		if options?.object(forKey: "maxRetransmits") != nil {
			rtcDataChannelConfiguration.maxRetransmits = options!.object(forKey: "maxRetransmits") as! Int32
		}

		 if options?.object(forKey: "protocol") != nil {
            rtcDataChannelConfiguration.`protocol` = options!.object(forKey: "protocol") as! String
		}

        if options?.object(forKey: "negotiated") != nil {
			rtcDataChannelConfiguration.isNegotiated = options!.object(forKey: "negotiated") as! Bool
		}

		if options?.object(forKey: "id") != nil {
			rtcDataChannelConfiguration.channelId = options!.object(forKey: "id") as! Int32
		}

		self.rtcDataChannel = rtcPeerConnection.dataChannel(forLabel: label,
			configuration: rtcDataChannelConfiguration
		)
        
		if self.rtcDataChannel == nil {
			NSLog("PluginRTCDataChannel#init() | rtcPeerConnection.createDataChannelWithLabel() failed")
			return
		}

		// Report definitive data to update the JS instance.
        //FIXME: Wow, another bloody dictionary problem
		self.eventListener!([
			"type": "new",
			"channel": [
				"ordered": self.rtcDataChannel!.isOrdered,
				"maxPacketLifeTime": self.rtcDataChannel!.maxPacketLifeTime as AnyObject,
				"maxRetransmits": self.rtcDataChannel!.maxRetransmits as AnyObject,
				"protocol": self.rtcDataChannel!.`protocol`,
				"negotiated": self.rtcDataChannel!.isNegotiated,
				"id": self.rtcDataChannel!.channelId as AnyObject,
				"readyState": PluginRTCTypes.dataChannelStates[self.rtcDataChannel!.readyState.rawValue] as String!,
				"bufferedAmount": self.rtcDataChannel!.bufferedAmount as AnyObject
			]
		])
	}


	deinit {
		NSLog("PluginRTCDataChannel#deinit()")
	}


	/**
	 * Constructor for pc.ondatachannel event.
	 */
	init(rtcDataChannel: RTCDataChannel) {
		NSLog("PluginRTCDataChannel#init()")

		self.rtcDataChannel = rtcDataChannel
	}


	func run() {
		NSLog("PluginRTCDataChannel#run()")

		self.rtcDataChannel!.delegate = self
	}


	func setListener(
		_ eventListener: @escaping (_ data: NSDictionary) -> Void,
		eventListenerForBinaryMessage: @escaping (_ data: Data) -> Void
	) {
		NSLog("PluginRTCDataChannel#setListener()")

		self.eventListener = eventListener
		self.eventListenerForBinaryMessage = eventListenerForBinaryMessage

		for readyState in self.lostStates {
			self.eventListener!([
				"type": "statechange",
				"readyState": readyState
			])
		}
		self.lostStates.removeAll()

		for buffer in self.lostMessages {
			self.emitReceivedMessage(buffer)
		}
		self.lostMessages.removeAll()
	}


	func sendString(
		_ data: String,
		callback: (_ data: NSDictionary) -> Void
	) {
		NSLog("PluginRTCDataChannel#sendString()")

		let buffer = RTCDataBuffer(
			data: (data.data(using: String.Encoding.utf8))!,
			isBinary: false
		)

		let result = self.rtcDataChannel!.sendData(buffer)
		if result == true {
            //FIXME: Dictionary
			callback([
				"bufferedAmount": self.rtcDataChannel!.bufferedAmount as AnyObject
			])
		} else {
			NSLog("PluginRTCDataChannel#sendString() | RTCDataChannel#sendData() failed")
		}
	}


	func sendBinary(
		_ data: Data,
		callback: (_ data: NSDictionary) -> Void
	) {
		NSLog("PluginRTCDataChannel#sendBinary()")

		let buffer = RTCDataBuffer(
			data: data,
			isBinary: true
		)

		let result = self.rtcDataChannel!.sendData(buffer)
		if result == true {
			callback([
                //FIXME: Dictionary
				"bufferedAmount": self.rtcDataChannel!.bufferedAmount as AnyObject
			])
		} else {
			NSLog("PluginRTCDataChannel#sendBinary() | RTCDataChannel#sendData() failed")
		}
	}


	func close() {
		NSLog("PluginRTCDataChannel#close()")

		self.rtcDataChannel!.close()
	}


	/**
	 * Methods inherited from RTCDataChannelDelegate.
	 */

	func dataChannelDidChangeState(_ channel: RTCDataChannel) {
		let state_str = PluginRTCTypes.dataChannelStates[self.rtcDataChannel!.readyState.rawValue] as String!

		NSLog("PluginRTCDataChannel | state changed [state:%@]", String(describing: state_str))

		if self.eventListener != nil {
			self.eventListener!([
				"type": "statechange",
				"readyState": state_str
			])
		} else {
			// It may happen that the eventListener is not yet set, so store the lost states.
			self.lostStates.append(state_str!)
		}
	}

	func dataChannel(_ channel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
		if buffer.isBinary == false {
			NSLog("PluginRTCDataChannel | utf8 message received")

			if self.eventListener != nil {
				self.emitReceivedMessage(buffer)
			} else {
				// It may happen that the eventListener is not yet set, so store the lost messages.
				self.lostMessages.append(buffer)
			}
		} else {
			NSLog("PluginRTCDataChannel | binary message received")

			if self.eventListenerForBinaryMessage != nil {
				self.emitReceivedMessage(buffer)
			} else {
				// It may happen that the eventListener is not yet set, so store the lost messages.
				self.lostMessages.append(buffer)
			}
		}
	}


	func emitReceivedMessage(_ buffer: RTCDataBuffer) {
		if buffer.isBinary == false {
			let string = NSString(
				data: buffer.data,
				encoding: String.Encoding.utf8.rawValue
			)

			self.eventListener!([
				"type": "message",
				"message": string as! String
			])
		} else {
			self.eventListenerForBinaryMessage!(buffer.data)
		}
	}
}
