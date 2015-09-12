'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

const jis0208 = require('./jis0208');

function Decoder() {
	this.lead = 0;
}

Decoder.prototype.handler = function(stream, byte) {
	// Initial byte
	if (this.lead === 0) {
		if (byte === EOF) {
			return EOF;
		}
		// Map ASCII characters & 0x80 directly
		if (byte <= 0x80) {
			return byte;
		}
		// Linear Katakana mapping
		if (byte >= 0xA1 && byte <= 0xDF) {
			return 0xFF61 + byte - 0xA1;
		}
		// A0, FD, FE, FF
		if (byte == 0xA0 || byte >= 0xFD) {
			return ERROR;
		}
		this.lead = byte;
		return CONTINUE;
	}

	// EOF should not be encountered for incomplete shift sequence
	if (byte === EOF) {
		this.lead = 0;
		return ERROR;
	}

	let lead = this.lead;
	this.lead = 0;
	let offset = byte < 0x7F ? 0x40 : 0x41;
	let leadOffset = lead < 0xA0 ? 0x81 : 0xC1;
	if (byte >= 0x40 && byte <= 0x7E || byte >= 0x80 && byte <= 0xFC) {
		let pointer = (lead - leadOffset) * 188 + byte - offset;
		let codepoint = jis0208[pointer];
		if (codepoint !== null) {
			return codepoint;
		}
		if (pointer >= 8836 && pointer <= 10528) {
			return 0xE000 + pointer - 8836;
		}
	}

	if (byte <= 0x7F) {
		stream.prepend(byte);
	}
	return ERROR;
}

function* Encoder() {
	while (true) {
		let codepoint = yield;
		if (codepoint === -1) {
			return;
		}
		if (codepoint <= 0x80) {
			yield codepoint;
			continue;
		}
		if (codepoint === 0x00A5) {
			yield 0x5C;
			continue;
		}
		if (codepoint === 0x203E) {
			yield 0x7E;
			continue;
		}
		if (codepoint >= 0xFF61 && codepoint <= 0xFF9F) {
			yield 0x8E;
			yield codepoint - 0xFF61 + 0xA1;
			continue;
		}
		let pointer = jis0208.indexOf(codepoint);
		if (pointer >= 8272 && pointer <= 8835) {
			pointer = -1;
		}
		if (pointer === -1) {
			yield - codepoint;
			continue;
		}
		let lead = (pointer / 188) | 0;
		let leadOffset = lead < 0x1F ? 0x81 : 0xC1;
		let trail = pointer % 188;
		let offset = trail < 0x3F ? 0x40 : 0x41;
		yield lead + leadOffset;
		yield trail + offset;
		continue;
	}
}

exports.decoder = Decoder;
exports.encoder = Encoder;