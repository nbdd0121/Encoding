'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

module.exports = function(codepage) {
	function Decoder() {}

	Decoder.prototype.handler = function(stream, byte) {
		if (byte <= 0x7F) {
			return byte;
		}
		let codepoint = codepage[byte - 0x80];
		if (codepoint !== null) {
			return codepoint;
		}
		return ERROR;
	}

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
			let pointer = codepage.indexOf(codepoint);
			if (pointer === -1) {
				yield - codepoint;
				continue;
			}
			yield pointer + 0x80;
			continue;
		}
	}

	return {
		decoder: Decoder,
		encoder: Encoder
	};
}