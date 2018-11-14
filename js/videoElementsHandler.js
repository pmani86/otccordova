/**
 * Expose a function that must be called when the library is loaded.
 * And also a helper function.
 */
module.exports = videoElementsHandler;
module.exports.observeVideo = observeVideo;


/**
 * Dependencies.
 */
var debug = require('debug')('iosrtc:videoElementsHandler'),
	MediaStreamRenderer = require('./MediaStreamRenderer'),
	ImgRenderer = require('./ImgRenderer'),


/**
 * Local variables.
 */

	// RegExp for MediaStream blobId.
	MEDIASTREAM_ID_REGEXP = new RegExp(/^MediaStream_/),

	// RegExp for Blob URI.
	BLOB_URI_REGEX = new RegExp(/^blob:/),

	// Dictionary of MediaStreamRenderers (provided via module argument).
	// - key: MediaStreamRenderer id.
	// - value: MediaStreamRenderer.
	mediaStreamRenderers,

	// Dictionary of MediaStreams (provided via module argument).
	// - key: MediaStream blobId.
	// - value: MediaStream.
	mediaStreams,

	imgRenderers,

	// Video element mutation observer.
	videoObserver = new MutationObserver(function (mutations) {
		var i, numMutations, mutation,
			video;

		for (i = 0, numMutations = mutations.length; i < numMutations; i++) {
			mutation = mutations[i];

			// HTML video element.
			video = mutation.target;

			// .src removed.
			if (!video.src && !video.srcObject) {
				// If this video element was previously handling a MediaStreamRenderer, release it.
				releaseMediaStreamRenderer(video);
				continue;
			}

			handleVideo(video);
		}
	}),

	imgObserver = new MutationObserver(function (mutations) {
		var i, numMutations, mutation,
			img;

		for (i = 0, numMutations = mutations.length; i < numMutations; i++) {
			mutation = mutations[i];

			// HTML video element.
			img = mutation.target;

			// .src removed.
			if (!img.src) {
				// If this video element was previously handling a MediaStreamRenderer, release it.
				releaseImgRenderer(img);
				continue;
			}

			handleImg(img);
		}
	}),

	// DOM mutation observer.
	domObserver = new MutationObserver(function (mutations) {
		var i, numMutations, mutation,
			j, numNodes, node;

		for (i = 0, numMutations = mutations.length; i < numMutations; i++) {
			mutation = mutations[i];

			// Check if there has been addition or deletion of nodes.
			if (mutation.type !== 'childList') {
				continue;
			}

			// Check added nodes.
			for (j = 0, numNodes = mutation.addedNodes.length; j < numNodes; j++) {
				node = mutation.addedNodes[j];

				checkNewNode(node);
			}

			// Check removed nodes.
			for (j = 0, numNodes = mutation.removedNodes.length; j < numNodes; j++) {
				node = mutation.removedNodes[j];

				checkRemovedNode(node);
			}
		}

		function checkNewNode(node) {
			var j, childNode;

			if (node.nodeName === 'VIDEO') {
				debug('new video element added');

				// Avoid same node firing more than once (really, may happen in some cases).
				if (node._iosrtcVideoHandled) {
					return;
				}
				node._iosrtcVideoHandled = true;

				// Observe changes in the video element.
				observeVideo(node);
			}	else if (node.nodeName === 'IMG') {
				// Avoid same node firing more than once (really, may happen in some cases).
				if (node._iosrtcImgHandled) {
					return;
				}
				node._iosrtcImgHandled = true;

				// Observe changes in the img element.
				if (node.hasAttribute('data-ios-iosrtc-img')) {
					observeImg(node);
				}
			} else {
				for (j = 0; j < node.childNodes.length; j++) {
					childNode = node.childNodes.item(j);

					checkNewNode(childNode);
				}
			}
		}

		function checkRemovedNode(node) {
			var j, childNode;

			if (node.nodeName === 'VIDEO') {
				debug('video element removed');

				// If this video element was previously handling a MediaStreamRenderer, release it.
				releaseMediaStreamRenderer(node);
				delete node._iosrtcVideoHandled;
			}	else if (node.nodeName === 'IMG') {
				debug('img element removed');

				// If this img element was previously handling a ImgRenderer, release it.
				releaseImgRenderer(node);
				delete node._iosrtcImgHandled;
			}	else {
				for (j = 0; j < node.childNodes.length; j++) {
					childNode = node.childNodes.item(j);

					checkRemovedNode(childNode);
				}
			}
		}
	});


function videoElementsHandler(_mediaStreams, _mediaStreamRenderers, _imgRenderers) {
	var existingVideos = document.querySelectorAll('video'),
		existingImgs = document.querySelectorAll('[data-ios-iosrtc-img]'),
		i, len,
		img,
		video;

	mediaStreams = _mediaStreams;
	mediaStreamRenderers = _mediaStreamRenderers;
	imgRenderers = _imgRenderers;

	// Search the whole document for already existing HTML video elements and observe them.
	for (i = 0, len = existingVideos.length; i < len; i++) {
		video = existingVideos.item(i);

		debug('video element found');

		observeVideo(video);
	}

	for (i = 0, len = existingImgs.length; i < len; i++) {
		img = existingImgs.item(i);

		debug('img element found');

		observeImg(img);
	}

	// Observe the whole document for additions of new HTML video elements and observe them.
	domObserver.observe(document, {
		// Set to true if additions and removals of the target node's child elements (including text nodes) are to
		// be observed.
		childList: true,
		// Set to true if mutations to target's attributes are to be observed.
		attributes: false,
		// Set to true if mutations to target's data are to be observed.
		characterData: false,
		// Set to true if mutations to not just target, but also target's descendants are to be observed.
		subtree: true,
		// Set to true if attributes is set to true and target's attribute value before the mutation needs to be
		// recorded.
		attributeOldValue: false,
		// Set to true if characterData is set to true and target's data before the mutation needs to be recorded.
		characterDataOldValue: false
		// Set to an array of attribute local names (without namespace) if not all attribute mutations need to be
		// observed.
		// attributeFilter:
	});
}


function observeVideo(video) {
	debug('observeVideo()');

	// If the video already has a src property but is not yet handled by the plugin
	// then handle it now.
	if ((video.src || video.srcObject) && !video._iosrtcMediaStreamRendererId) {
		handleVideo(video);
	}

	// Add .src observer to the video element.
	videoObserver.observe(video, {
		// Set to true if additions and removals of the target node's child elements (including text
		// nodes) are to be observed.
		childList: false,
		// Set to true if mutations to target's attributes are to be observed.
		attributes: true,
		// Set to true if mutations to target's data are to be observed.
		characterData: false,
		// Set to true if mutations to not just target, but also target's descendants are to be observed.
		subtree: false,
		// Set to true if attributes is set to true and target's attribute value before the mutation
		// needs to be recorded.
		attributeOldValue: false,
		// Set to true if characterData is set to true and target's data before the mutation needs to be
		// recorded.
		characterDataOldValue: false,
		// Set to an array of attribute local names (without namespace) if not all attribute mutations
		// need to be observed.
		// TODO: Add srcObject, mozSrcObject
		attributeFilter: ['srcobjecttrigger', 'src']
	});

	// Intercept video 'error' events if it's due to the attached MediaStream.
	video.addEventListener('error', function (event) {
		if (video.error.code === global.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && BLOB_URI_REGEX.test(video.src)) {
			debug('stopping "error" event propagation for video element');

			event.stopImmediatePropagation();
		}
	});
}

function observeImg(img) {
	debug('observeImg()');

	// If the img already has a src property but is not yet handled by the plugin
	// then handle it now.
	if (img.src && !img._iosrtcImgRendererId) {
		handleImg(img);
	}

	// Add .src observer to the img element.
	imgObserver.observe(img, {
		// Set to true if additions and removals of the target node's child elements (including text
		// nodes) are to be observed.
		childList: false,
		// Set to true if mutations to target's attributes are to be observed.
		attributes: true,
		// Set to true if mutations to target's data are to be observed.
		characterData: false,
		// Set to true if mutations to not just target, but also target's descendants are to be observed.
		subtree: false,
		// Set to true if attributes is set to true and target's attribute value before the mutation
		// needs to be recorded.
		attributeOldValue: false,
		// Set to true if characterData is set to true and target's data before the mutation needs to be
		// recorded.
		characterDataOldValue: false,
		// Set to an array of attribute local names (without namespace) if not all attribute mutations
		// need to be observed.
		// TODO: Add srcObject, mozSrcObject
		attributeFilter: ['src']
	});
}

/**
 * Private API.
 */

function handleVideo(video) {
	if (video.srcObject) {
		provideMediaStreamRenderer(video);
		return;
	}

	var xhr = new XMLHttpRequest();

	xhr.open('GET', video.src, true);
	xhr.responseType = 'blob';
	xhr.onload = function () {
		if (xhr.status !== 200) {
			// If this video element was previously handling a MediaStreamRenderer, release it.
			releaseMediaStreamRenderer(video);

			return;
		}

		var reader = new FileReader();

		// Some versions of Safari fail to set onloadend property, some others do not react
		// on 'loadend' event. Try everything here.
		try {
			reader.onloadend = onloadend;
		} catch (error) {
			reader.addEventListener('loadend', onloadend);
		}
		reader.readAsText(xhr.response);

		function onloadend() {
			var mediaStreamBlobId = reader.result;

			// The retrieved URL does not point to a MediaStream.
			if (!mediaStreamBlobId || typeof mediaStreamBlobId !== 'string' || !MEDIASTREAM_ID_REGEXP.test(mediaStreamBlobId)) {
				// If this video element was previously handling a MediaStreamRenderer, release it.
				releaseMediaStreamRenderer(video);

				return;
			}

			provideMediaStreamRenderer(video, mediaStreamBlobId);
		}
	};
	xhr.send();
}

function handleImg(img) {
	var xhr = new XMLHttpRequest();

	xhr.open('GET', img.src, true);
	xhr.responseType = 'blob';
	xhr.onload = function () {
		if (xhr.status !== 200) {
			// If this img element was previously handling a MediaStreamRenderer, release it.
			releaseImgRenderer(img);

			return;
		}

		var reader = new FileReader();

		// Some versions of Safari fail to set onloadend property, some others do not react
		// on 'loadend' event. Try everything here.
		try {
			reader.onloadend = onloadend;
		} catch (error) {
			reader.addEventListener('loadend', onloadend);
		}
		reader.readAsDataURL(xhr.response);

		function onloadend() {
			var imgData = reader.result.substr(reader.result.indexOf(',') + 1);
			provideImgRenderer(img, imgData);
		}
	};
	xhr.send();
}

function provideMediaStreamRenderer(video, mediaStreamBlobId) {
	var mediaStream,
		mediaStreamRenderer = mediaStreamRenderers[video._iosrtcMediaStreamRendererId];
	if (mediaStreamBlobId) {
		mediaStream = mediaStreams[mediaStreamBlobId];
	} else {
		mediaStream = video.srcObject;
	}

	if (!mediaStream) {
		releaseMediaStreamRenderer(video);

		return;
	}

	if (mediaStreamRenderer) {
		mediaStreamRenderer.render(mediaStream);
	} else {
		mediaStreamRenderer = new MediaStreamRenderer(video);
		mediaStreamRenderer.render(mediaStream);

		mediaStreamRenderers[mediaStreamRenderer.id] = mediaStreamRenderer;
		video._iosrtcMediaStreamRendererId = mediaStreamRenderer.id;
	}

	// Close the MediaStreamRenderer of this video if it emits "close" event.
	mediaStreamRenderer.addEventListener('close', function () {
		if (mediaStreamRenderers[video._iosrtcMediaStreamRendererId] !== mediaStreamRenderer) {
			return;
		}

		releaseMediaStreamRenderer(video);
	});

	// Override some <video> properties.
	// NOTE: This is a terrible hack but it works.
	Object.defineProperties(video, {
		videoWidth: {
			configurable: true,
			get: function () {
				return mediaStreamRenderer.videoWidth || 0;
			}
		},
		videoHeight: {
			configurable: true,
			get: function () {
				return mediaStreamRenderer.videoHeight || 0;
			}
		},
		readyState: {
			configurable: true,
			get: function () {
				if (mediaStreamRenderer && mediaStreamRenderer.stream && mediaStreamRenderer.stream.connected) {
					return video.HAVE_ENOUGH_DATA;
				} else {
					return video.HAVE_NOTHING;
				}
			}
		}
	});
}

function provideImgRenderer(img, imgData) {
	var imgRenderer = imgRenderers[img._iosrtcImgRendererId];

	if (imgRenderer) {
		imgRenderer.render(imgData);
	} else {
		img.style.visibility = "hidden";
		imgRenderer = new ImgRenderer(img);
		imgRenderer.render(imgData);

		imgRenderers[imgRenderer.id] = imgRenderer;
		img._iosrtcImgRendererId = imgRenderer.id;
	}
}

function releaseMediaStreamRenderer(video) {
	if (!video._iosrtcMediaStreamRendererId) {
		return;
	}

	var mediaStreamRenderer = mediaStreamRenderers[video._iosrtcMediaStreamRendererId];

	if (mediaStreamRenderer) {
		delete mediaStreamRenderers[video._iosrtcMediaStreamRendererId];
		mediaStreamRenderer.close();
	}

	delete video._iosrtcMediaStreamRendererId;

	// Remove overrided <video> properties.
	delete video.videoWidth;
	delete video.videoHeight;
	delete video.readyState;
}

function releaseImgRenderer(img) {
	if (!img._iosrtcImgRendererId) {
		return;
	}

	img.style.visibility = "";
	var imgRenderer = imgRenderers[img._iosrtcImgRendererId];

	if (imgRenderer) {
		delete imgRenderers[img._iosrtcImgRendererId];
		imgRenderer.close();
	}

	delete img._iosrtcImgRendererId;
}
