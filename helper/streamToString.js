
var util = require('util');

module.exports = function(asset, callback) {
	asset = util._extend({}, asset);

	asset.content.setEncoding('utf8');

	var body = '';
	asset.content.on('data', function(data) {
		body += data;
	});

	asset.content.on('end', function() {
		asset.content = body;
		callback(null, asset);
	});
};
