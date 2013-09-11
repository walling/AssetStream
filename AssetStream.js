
var AssetStream = exports;

AssetStream.version = require('./package.json').version;

AssetStream.mime = require('mime');

AssetStream.Source = require('./Source');
AssetStream.Transform = require('./Transform');
AssetStream.Destination = require('./Destination');

AssetStream.helper = require('./helper/index');
AssetStream.source = require('./source/index');
AssetStream.transform = require('./transform/index');
