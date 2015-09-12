'use strict';

const gb18030 = require('./gb18030');

exports.decoder = gb18030.decoder;
exports.encoder = gb18030.encoder.bind(null, true);