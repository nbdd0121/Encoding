'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

function Decoder() {
	this.lead = -1;
	this.leadSurrogate = -1;
	this.be = false;
}

Decoder.prototype.handler = function(stream, byte) {
	if (byte === EOF) {
		if (this.lead !== -1 || this.leadSurrogate !== -1) {
			this.lead = this.leadSurrogate = -1;
			return ERROR;
		}
		return EOF;
	}

	if (this.lead === -1) {
		this.lead = byte;
		return CONTINUE;
	}

	// Use BE flags since this decoder is shared
	let codeunit = this.be ? (this.lead << 8) + byte : (byte << 8) + this.lead;

	// If previous one is lead surrogate
	if (this.leadSurrogate !== -1) {
		let ls = this.leadSurrogate;
		this.leadSurrogate = -1;
		if (codeunit >= 0xDC00 && codeunit <= 0xDFFF) {
			this.lead = -1;
			return 0x10000 + ((ls - 0xD800) << 10) + (codeunit - 0xDC00);
		}
		stream.prepend(this.lead, byte);
		this.lead = -1;
		return ERROR;
	}
	this.lead = -1;
	// Start a lead surrogate
	if (codeunit >= 0xD800 && codeunit <= 0xDBFF) {
		this.leadSurrogate = codeunit;
		return CONTINUE;
	}
	if (codeunit >= 0xDC00 && codeunit <= 0xDFFF) {
		return ERROR;
	}
	return codeunit;
}

function* Encoder(be) {
	be = be || false;
	while (true) {
		let codepoint = yield;
		if (codepoint === -1) {
			return -1;
		}
		if (codepoint <= 0xFFFF) {
			let byte1 = codepoint >> 8;
			let byte2 = codepoint & 0xFF;
			if (be) {
				yield byte1;
				yield byte2;
			} else {
				yield byte2;
				yield byte1;
			}
			continue;
		}
		let lead = ((codepoint - 0x10000) >> 10) + 0xD800;
		let trail = ((codepoint - 0x10000) & 0x3FF) + 0xDC00;
		let lead1 = lead >> 8;
		let lead2 = lead & 0xFF;
		let trail1 = lead >> 8;
		let trail2 = lead & 0xFF;
		if (be) {
			yield lead1;
			yield lead2;
			yield trail1;
			yield trail2;
		} else {
			yield lead2;
			yield lead1;
			yield trail2;
			yield trail1;
		}
	}
}

exports.decoder = Decoder;
exports.encoder = Encoder;