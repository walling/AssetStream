
var Writable = require('stream').Writable;
var util = require('util');

util.inherits(AssetDestination, Writable);
function AssetDestination(options) {
	var self = this;

	options = util._extend({}, options);
	options.objectMode = true;
	Writable.call(self, options);

	self.destination = options.destination || null;
	if (self.destination) {
		self.emit('_destination');
	}
}

AssetDestination.prototype._write = function(asset, encoding, next) {
	var self = this;

	if (self.destination) {
		self.destination(asset || null, next);
	} else {
		self.once('_destination', function() {
			self._write(asset, encoding, next);
		});
	}
};

AssetDestination.create = function(destination) {
	function destinationFactory() {
		var assetDestination = new AssetDestination();
		assetDestination.destination = destination.apply(assetDestination, arguments);
		assetDestination.emit('_destination');
		return assetDestination;
	}
	destinationFactory.on = destinationFactory.pipe = function() {
		throw new Error('You have to create an instance of this pipe before using it.');
	};
	return destinationFactory;
};

module.exports = AssetDestination;
