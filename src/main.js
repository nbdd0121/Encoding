'use strict';

class Stream {
	constructor(bytes) {
		this.bytes = bytes;
	}

	prepend() {
		Array.prototype.unshift.apply(this.bytes, arguments);
	}

	push() {
		Array.prototype.push.apply(this.bytes, arguments);
	}

	read() {
		if (this.bytes.length === 0) return -1;
		return this.bytes.shift();
	}
}

function decode(string, charset) {
	let array = [];
	for (let unit of string) {
		array.push(unit.charCodeAt(0));
	}
	array.push(-1);
	let stream = new Stream(array);
	let name = require('./Label')(charset);
	let decoder = new(require('./encoding/' + name).decoder)();
	let ret = '';
	let cp;
	while (true) {
		cp = decoder.handler(stream, stream.read());
		if (cp >= 0) ret += String.fromCodePoint(cp);
		else if (cp !== -2) break;
	}
	if (cp === -3) console.log('ERROR!');
	return ret;
}

function encode(string, charset) {
	let index = 0;
	let name = require('./Label')(charset);
	let encoder = require('./encoding/' + name).encoder();

	// Initialize generator
	let result = encoder.next();
	let ret = '';
	while (!result.done) {
		if (result.value) {
			if (result.value < 0) {
				console.log('ERROR ' + String.fromCodePoint(-result.value));
				break;
			}
			ret += String.fromCodePoint(result.value);
			result = encoder.next();
		} else {
			if (index >= string.length) {
				result = encoder.next(-1);
			} else {
				let codepoint = string.codePointAt(index);
				index += (codepoint >= 0x10000) + 1;
				result = encoder.next(codepoint);
			}
		}
	}

	return ret;
}
