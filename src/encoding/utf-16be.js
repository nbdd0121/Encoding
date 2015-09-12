'use strict';

const utf16le = require('./utf-16le');

exports.decoder = function() {
	let decoder = new utf16le.decoder();
	decoder.be = true;
	return decoder;
}

exports.encoder = utf16le.encoder.bind(null, true);