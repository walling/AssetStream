
var UglifyJS = require('uglify-js');

var wrapCommonJS = new UglifyJS.TreeTransformer(null, function(node) {
	if (node instanceof UglifyJS.AST_Toplevel) {
		node.body = [
			new UglifyJS.AST_Function({
				name: null,
				argnames: [
					new UglifyJS.AST_SymbolFunarg({
						name: 'require',
						start: node.start,
						end: node.end
					}),
					new UglifyJS.AST_SymbolFunarg({
						name: 'exports',
						start: node.start,
						end: node.end
					}),
					new UglifyJS.AST_SymbolFunarg({
						name: 'module',
						start: node.start,
						end: node.end
					}),
					new UglifyJS.AST_SymbolFunarg({
						name: 'global',
						start: node.start,
						end: node.end
					})
				],
				body: node.body,
				start: node.start,
				end: node.end
			})
		];
		return node;
	}
});

module.exports = function(asset, options, callback) {
	try {
		var startTime = new Date();
		var firstToken = null;

		var warnings = [];
		UglifyJS.AST_Node.warn = function(text, properties) {
			// Ignore warnings regarding dropping one of the module parameters.
			if (text === 'Dropping unused function argument {name} [{file}:{line},{col}]' &&
					(/^(require|exports|module|global)$/).test(properties.name) &&
					properties.line === firstToken.line &&
					properties.col === firstToken.col) {
				return;
			}

			properties.message = UglifyJS.string_template(text, properties);
			delete properties.file;
			warnings.push(properties);
		};

		var initialAST;
		try {
			initialAST = UglifyJS.parse(asset.content.data, {
				filename: asset.path
			});
		} catch (error) {

			// Quickfix for UglifyJS2 issue #288: https://github.com/mishoo/UglifyJS2/issues/288
			// This makes the generated source-map invalid on line 1.
			if (error && error.message === "'return' outside of function") {
				var data = '(function(){' + asset.content.data + '\n}.call(this));';
				initialAST = UglifyJS.parse(data, {
					filename: asset.path
				});
			} else {
				throw error;
			}

		}

		firstToken = initialAST.start;

		var dependencies = {};
		var findRequires = new UglifyJS.TreeWalker(function(node) {
			if (node instanceof UglifyJS.AST_Call && node.expression.name === 'require') {
				if (node.args.length === 1 && node.args[0] instanceof UglifyJS.AST_String) {
					dependencies[node.args[0].value] = true;
				} else {
					UglifyJS.AST_Node.warn('Dropping require statement [{file}:{line},{col}]', {
						file: node.start.file,
						line: node.start.line,
						col: node.start.col
					});
				}
			}
		});
		initialAST.walk(findRequires);
		dependencies = Object.keys(dependencies).sort();

		var noMinify = !!(options && options.noMinify);
		if (noMinify) {
			asset.content.minified =
				'function(require,exports,module,global){' + asset.content.data + '}';
			asset.content.sourceMap = null;
			asset.content.dependencies = dependencies;
		} else {
			var wrappedAST = initialAST.transform(wrapCommonJS);
			wrappedAST.figure_out_scope();

			var compressor = UglifyJS.Compressor();
			var compressedAST = wrappedAST.transform(compressor);
			compressedAST.figure_out_scope();
			compressedAST.mangle_names();

			var sourceMap = UglifyJS.SourceMap();
			var code = UglifyJS.OutputStream({
				source_map: sourceMap
			});
			compressedAST.print(code);

			asset.content.minified = code.toString();
			asset.content.sourceMap = JSON.parse(sourceMap.toString());
			asset.content.dependencies = dependencies;
		}

		var endTime = new Date();
		asset.transforms = (asset.transforms || []).concat([{
			name: 'javaScriptMinify',
			time: endTime - startTime,
			warnings: warnings.length > 0 ? warnings : undefined,
			noMinify: !!noMinify
		}]);

		callback(null, asset);
	} catch (error) {
		var message = 'Failed to minify ' + asset.path;
		var err;

		if (error instanceof UglifyJS.JS_Parse_Error) {
			if (error.line) {
				message += ':' + error.line;
				if (error.col) {
					message += ':' + error.col;
				}
			}
			if (error.message) {
				message += ': ' + error.message;
			}

			err = {
				message: message,
				path: asset.path,
				line: error.line,
				column: error.col
			};
		} else {
			err = {
				message: message,
				path: asset.path,
				cause: {
					name: error.name,
					message: error.message,
					stack: error.stack
				}
			};
		}

		callback(err, asset);
	}
};
