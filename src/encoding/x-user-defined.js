'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

function Decoder() {}

Decoder.prototype.handler = function(stream, byte) {
	if (byte <= 0x7F) {
		return byte;
	}
	return 0xF780 + byte - 0x80;
}

function* Encoder() {
	while (true) {
		let codepoint = yield;
		if (codepoint === -1) {
			return;
		}
		if (codepoint <= 0x7F) {
			yield codepoint;
			continue;
		}
		if (codepoint >= 0xF780 && codepoint <= 0xF7FF) {
			yield point - 0xF780 + 0x80;
			continue;
		}
		yield - codepoint;
	}
}

exports.decoder = handler;