'use strict';

const common = require('./common');
const EOF = common.EOF;
const CONTINUE = common.CONTINUE;
const ERROR = common.ERROR;

function Decoder() {
	this.flag = false;
}

Decoder.prototype.handler = function(stream, byte) {
	if (this.flag) {
		return EOF;
	} else {
		this.flag = true;
		return ERROR;
	}
}

exports.decoder = Decoder;
exports.encoder = require('./utf-8').encoder;