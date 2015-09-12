'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

const ASCII = 0;
const ROMAN = 1;
const KATAKANA = 2;
const LEADBYTE = 3;
const TRAILBYTE = 4;
const ESCAPESTART = 5;
const ESCAPE = 6;
const JIS0208 = 7;

const jis0208 = require('./jis0208');

function Decoder() {
	this.lead = 0;
	this.state = ASCII;
	this.output = ASCII;
	this.flag = false;
}

Decoder.prototype.handler = function(stream, byte) {
	switch (this.state) {
		case ASCII:
			if (byte === EOF) {
				return EOF;
			} else if (byte === 0x1B) {
				this.state = ESCAPESTART;
				return CONTINUE;
			} else if (byte === 0xE || byte === 0xF || byte > 0x7F) {
				this.flag = false;
				return ERROR;
			} else {
				this.flag = false;
				return byte;
			}
		case ROMAN:
			if (byte === EOF) {
				return EOF;
			} else if (byte === 0x1B) {
				this.state = ESCAPESTART;
				return CONTINUE;
			} else if (byte === 0x5C) {
				this.flag = false;
				return 0x00A5;
			} else if (byte === 0x7E) {
				this.flag = false;
				return 0x203E;
			} else if (byte === 0xE || byte === 0xF || byte > 0x7F) {
				this.flag = false;
				return ERROR;
			} else {
				this.flag = false;
				return byte;
			}
		case KATAKANA:
			if (byte === EOF) {
				return EOF;
			} else if (byte === 0x1B) {
				this.state = ESCAPESTART;
				return CONTINUE;
			} else if (byte >= 0x21 && byte <= 0x5F) {
				this.flag = false;
				return 0xFF61 + byte - 0x21;
			} else {
				this.flag = false;
				return ERROR;
			}
		case LEADBYTE:
			if (byte === EOF) {
				return EOF;
			} else if (byte === 0x1B) {
				this.state = ESCAPESTART;
				return CONTINUE;
			} else if (byte >= 0x21 && byte <= 0x7E) {
				this.flag = false;
				this.lead = byte;
				this.state = TRAILBYTE;
				return CONTINUE;
			} else {
				this.flag = false;
				return ERROR;
			}
		case TRAILBYTE:
			if (byte === EOF) {
				this.state = LEADBYTE;
				stream.prepend(byte);
				return ERROR;
			} else if (byte === 0x1B) {
				this.state = ESCAPESTART;
				return ERROR;
			} else if (byte >= 0x21 && byte <= 0x7E) {
				this.state = LEADBYTE;
				let pointer = (this.lead - 0x21) * 94 + byte - 0x21;
				let codepoint = jis0208[pointer];
				if (codepoint === null) {
					return ERROR;
				}
				return codepoint;
			} else {
				this.state = LEADBYTE;
				return ERROR;
			}
		case ESCAPESTART:
			if (byte === 0x24 || byte === 0x28) {
				this.lead = byte;
				this.state = ESCAPE;
				return CONTINUE;
			}
			stream.prepend(byte);
			this.flag = false;
			this.state = this.output;
			return ERROR;
		default:
			{
				let lead = this.lead;
				this.lead = 0;
				let state;
				if (lead === 0x28 && byte === 0x42) state = ASCII;
				else if (lead === 0x28 && byte === 0x4A) state = ROMAN;
				else if (lead === 0x28 && byte === 0x49) state = KATAKANA;
				else if (lead === 0x24 && (byte === 0x40 || byte == 0x42)) state = LEADBYTE;
				else {
					stream.prepend(lead, byte);
					this.flag = false;
					this.state = this.output;
					return ERROR;
				}
				this.state = this.output = state;
				let flag = this.flag;
				this.flag = true;
				return flag ? ERROR : CONTINUE;
			}
	}
}

function* Encoder() {
	let state = ASCII;
	while (true) {
		let codepoint = yield;
		if (codepoint === -1) {
			if (state !== ASCII) {
				yield 0x1B;
				yield 0x28;
				yield 0x42;
			}
			return;
		}
		if (codepoint <= 0x7F) {
			if (codepoint !== ASCII &&
				(codepoint !== ROMAN || codepoint === 0x5C || codepoint === 0x7E)) {
				state = ASCII;
				yield 0x1B;
				yield 0x28;
				yield 0x42;
			}
			yield codepoint;
			continue;
		}
		if (codepoint === 0x00A5 || codepoint === 0x203E) {
			if (state !== ROMAN) {
				state = ROMAN;
				yield 0x1B;
				yield 0x28;
				yield 0x4A;
			}
			yield codepoint === 0x00A5 ? 0x5C : 0x7E;
			continue;
		}
		if (codepoint === 0x2022) {
			codepoint = 0xFF0D;
		}
		let pointer = jis0208.indexOf(codepoint);
		if (pointer >= 8272 && pointer <= 8835) {
			pointer = -1;
		}
		if (pointer === -1) {
			yield - codepoint;
			continue;
		}
		if (state !== JIS0208) {
			state = JIS0208;
			yield 0x1B;
			yield 0x24;
			yield 0x42;
		}
		let lead = ((pointer / 94) | 0) + 0x21;
		let trail = pointer % 94 + 0x21;
		yield lead;
		yield trail;
	}
}

exports.decoder = Decoder;
exports.encoder = Encoder;