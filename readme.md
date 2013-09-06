Stream and transform your browser assets

The goal is to make you able to build your own high performance asset pipeline from small atomic parts, ie. JavaScript bundling. The codebase is still very experimental, so expect big changes ahead.

Example:

```javascript
var AssetStream = require('assetstream');
var contentSize = AssetStream.helper.contentSize;

// Teach system about Handlebars templates mimetype.
var mime = require('mime');
mime.define({
	'text/x-handlebars-template': ['hbs']
});

// Create our own asset writable stream, that just outputs the event
// (either 'update' or 'delete'), the given path and the content size.
var debugOutput = AssetStream.Destination.create(function() {
	return function(asset, next) {
		console.log('%s %s (%s B)', asset.event, asset.path, contentSize(asset));
		next();
	};
});

// Setup our pipeline from building blocks. This is not as efficient as
// it could be. For higher performance use the transformCache helper.
AssetStream.source.directory({
	directory: __dirname,
	exclude: '**/*.bundle.js'
}).pipe(
	AssetStream.transform.precompileHandlebars()
).pipe(
	AssetStream.transform.minifyJavaScript()
).pipe(
	AssetStream.transform.bundleJavaScript({ entryPath: '/my-app' })
).pipe(
	AssetStream.transform.compressText()
).pipe(
	debugOutput()
);
```

Look around the codebase, if you're curious.
