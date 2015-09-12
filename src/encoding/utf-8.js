'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

function Decoder() {
	this.codepoint = 0;
	this.needed = 0;
	this.loBound = 0x80;
	this.hiBound = 0xBF;
}

Decoder.prototype.handler = function(stream, byte) {
	if (this.needed === 0) {
		if (byte <= 0x7F) {
			return byte;
		} else if (byte >= 0xC2 && byte <= 0xDF) {
			this.needed = 1;
			this.codepoint = byte - 0xC0;
			return CONTINUE;
		} else if (byte >= 0xE0 && byte <= 0xEF) {
			if (byte === 0xE0) this.loBound = 0xA0;
			if (byte === 0xED) this.hiBound = 0x9F;
			this.needed = 2;
			this.codepoint = byte - 0xE0;
			return CONTINUE;
		} else if (byte >= 0xF0 && byte <= 0xF4) {
			if (byte === 0xF0) this.loBound = 0x90;
			if (byte === 0xF4) this.hiBound = 0x8F;
			this.needed = 3;
			this.codepoint = byte - 0xF0;
			return CONTINUE;
		} else {
			console.log(byte);
			return ERROR;
		}
	}

	if (byte === EOF) {
		this.needed = 0;
		return ERROR;
	}

	if (!(byte >= this.loBound && byte <= this.hiBound)) {
		this.codepoint = this.needed = 0;
		this.loBound = 0x80;
		this.hiBound = 0xBF;
		stream.prepend(byte);
		return ERROR;
	}

	this.loBound = 0x80;
	this.hiBound = 0xBF;
	this.codepoint = (this.codepoint << 6) + (byte - 0x80);

	if (--this.needed !== 0) {
		return CONTINUE;
	}

	let codepoint = this.codepoint;
	this.codepoint = 0;
	return codepoint;
}

exports.decoder = Decoder;

function* Encoder(input, output) {
	while (true) {
		let codepoint = yield;
		if (codepoint === EOF) {
			return;
		}
		if (codepoint <= 0x7F) {
			yield codepoint;
			continue;
		}
		let count, offset;
		if (codepoint <= 0x07FF) {
			count = 1;
			offset = 0xC0;
		} else if (codepoint <= 0xFFFF) {
			count = 2;
			offset = 0xE0;
		} else {
			count = 3;
			offset = 0xF0;
		}
		yield (codepoint >> (6 * count)) + offset;
		while (count > 0) {
			--count;
			let temp = codepoint >> (6 * count);
			yield 0x80 | (temp & 0x3F);
		}
	}
}

exports.encoder = Encoder;