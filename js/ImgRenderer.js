/**
 * Expose the ImgRenderer class.
 */
module.exports = ImgRenderer;


/**
 * Dependencies.
 */
var
	debug = require('debug')('iosrtc:ImgRenderer'),
	exec = require('cordova/exec'),
	randomNumber = require('random-number').generator({min: 10000, max: 99999, integer: true}),
	EventTarget = require('yaeti').EventTarget;

function ImgRenderer(element) {
	debug('new() | [element:"%s"]', element);

	var self = this;

	// Make this an EventTarget.
	EventTarget.call(this);

	if (!(element instanceof HTMLElement)) {
		throw new Error('a valid HTMLElement is required');
	}

	// Public atributes.
	this.element = element;
	this.stream = undefined;
	this.naturalWidth = undefined;
	this.naturalHeight = undefined;

	// Private attributes.
	this.id = randomNumber();

	function onResultOK(data) {
		onEvent.call(self, data);
	}

	exec(onResultOK, null, 'iosrtcPlugin', 'new_ImgRenderer', [this.id]);

	this.refresh(this);
}


ImgRenderer.prototype.render = function (imgData) {
	debug('render()');

	this.imgData = imgData;


	exec(null, null, 'iosrtcPlugin', 'ImgRenderer_render', [this.id, this.imgData]);
};


ImgRenderer.prototype.refresh = function () {
	debug('refresh()');

	var elementPositionAndSize = getElementPositionAndSize.call(this),
		computedStyle,
		imgRatio,
		elementRatio,
		elementLeft = elementPositionAndSize.left,
		elementTop = elementPositionAndSize.top,
		elementWidth = elementPositionAndSize.width,
		elementHeight = elementPositionAndSize.height,
		videoViewWidth,
		videoViewHeight,
		visible,
		opacity,
		zIndex,
		mirrored,
		objectFit,
		clip,
		borderRadius,
		paddingTop,
		paddingBottom,
		paddingLeft,
		paddingRight;

	computedStyle = window.getComputedStyle(this.element);

	// get padding values
	paddingTop = parseInt(computedStyle.paddingTop) | 0;
	paddingBottom = parseInt(computedStyle.paddingBottom) | 0;
	paddingLeft = parseInt(computedStyle.paddingLeft) | 0;
	paddingRight = parseInt(computedStyle.paddingRight) | 0;

	// fix position according to padding
	elementLeft += paddingLeft;
	elementTop += paddingTop;

	// fix width and height according to padding
	elementWidth -= (paddingLeft + paddingRight);
	elementHeight -= (paddingTop + paddingBottom);

	videoViewWidth = elementWidth;
	videoViewHeight = elementHeight;

	visible = !!this.element.offsetHeight;  // Returns 0 if element or any parent is hidden.

	// opacity
	opacity = parseFloat(computedStyle.opacity);

	// zIndex
	zIndex = parseFloat(computedStyle.zIndex) || parseFloat(this.element.style.zIndex) || 0;

	// mirrored (detect "-webkit-transform: scaleX(-1);" or equivalent)
	if (computedStyle.transform === 'matrix(-1, 0, 0, 1, 0, 0)' ||
		computedStyle['-webkit-transform'] === 'matrix(-1, 0, 0, 1, 0, 0)') {
		mirrored = true;
	} else {
		mirrored = false;
	}

	// objectFit ('contain' is set as default value)
	objectFit = computedStyle.objectFit || 'contain';

	// clip
	if (objectFit === 'none') {
		clip = false;
	} else {
		clip = true;
	}

	// borderRadius
	borderRadius = parseFloat(computedStyle.borderRadius);
	if (/%$/.test(borderRadius)) {
		borderRadius = Math.min(elementHeight, elementWidth) * borderRadius;
	}

	/**
	 * No video yet, so just update the UIView with the element settings.
	 */

	if (!this.element.naturalWidth || !this.element.naturalHeight) {
		debug('refresh() | no video track yet');

		nativeRefresh.call(this);
		return;
	}

	imgRatio = this.element.naturalWidth / this.element.naturalHeight;

	/**
	 * Element has no width and/or no height.
	 */

	if (!elementWidth || !elementHeight) {
		debug('refresh() | video element has 0 width and/or 0 height');

		nativeRefresh.call(this);
		return;
	}

	/**
	 * Set video view position and size.
	 */

	elementRatio = elementWidth / elementHeight;

	switch (objectFit) {
		case 'cover':
			// The element has higher or equal width/height ratio than the video.
			if (elementRatio >= imgRatio) {
				videoViewWidth = elementWidth;
				videoViewHeight = videoViewWidth / imgRatio;
			// The element has lower width/height ratio than the video.
			} else if (elementRatio < imgRatio) {
				videoViewHeight = elementHeight;
				videoViewWidth = videoViewHeight * imgRatio;
			}
			break;

		case 'fill':
			videoViewHeight = elementHeight;
			videoViewWidth = elementWidth;
			break;

		case 'none':
			videoViewHeight = this.naturalHeight;
			videoViewWidth = this.naturalWidth;
			break;

		case 'scale-down':
			// Same as 'none'.
			if (this.naturalWidth <= elementWidth && this.naturalHeight <= elementHeight) {
				videoViewHeight = this.naturalHeight;
				videoViewWidth = this.naturalWidth;
			// Same as 'contain'.
			} else {
				// The element has higher or equal width/height ratio than the video.
				if (elementRatio >= imgRatio) {
					videoViewHeight = elementHeight;
					videoViewWidth = videoViewHeight * imgRatio;
				// The element has lower width/height ratio than the video.
				} else if (elementRatio < imgRatio) {
					videoViewWidth = elementWidth;
					videoViewHeight = videoViewWidth / imgRatio;
				}
			}
			break;

		// 'contain'.
		default:
			objectFit = 'contain';
			// The element has higher or equal width/height ratio than the video.
			if (elementRatio >= imgRatio) {
				videoViewHeight = elementHeight;
				videoViewWidth = videoViewHeight * imgRatio;
			// The element has lower width/height ratio than the video.
			} else if (elementRatio < imgRatio) {
				videoViewWidth = elementWidth;
				videoViewHeight = videoViewWidth / imgRatio;
			}
			break;
	}

	nativeRefresh.call(this);

	function nativeRefresh() {
		var data = {
			elementLeft: elementLeft,
			elementTop: elementTop,
			elementWidth: elementWidth,
			elementHeight: elementHeight,
			videoViewWidth: videoViewWidth,
			videoViewHeight: videoViewHeight,
			visible: visible,
			opacity: opacity,
			zIndex: zIndex,
			mirrored: mirrored,
			objectFit: objectFit,
			clip: clip,
			borderRadius: borderRadius
		};

		debug('refresh() | [data:%o]', data);

		exec(null, null, 'iosrtcPlugin', 'ImgRenderer_refresh', [this.id, data]);
	}
};


ImgRenderer.prototype.close = function () {
	debug('close()');

	exec(null, null, 'iosrtcPlugin', 'ImgRenderer_close', [this.id]);
};


/**
 * Private API.
 */


function onEvent(data) {
	var type = data.type,
		event;

	debug('onEvent() | [type:%s, data:%o]', type, data);

	switch (type) {
		case 'videoresize':
			this.naturalWidth = data.size.width;
			this.naturalHeight = data.size.height;
			this.refresh(this);

			event = new Event(type);
			event.naturalWidth = data.size.width;
			event.naturalHeight = data.size.height;
			this.dispatchEvent(event);

			break;
	}
}


function getElementPositionAndSize() {
	var rect = this.element.getBoundingClientRect();

	return {
		left:   rect.left + this.element.clientLeft,
		top:    rect.top + this.element.clientTop,
		width:  this.element.clientWidth,
		height: this.element.clientHeight
	};
}
