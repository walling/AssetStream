
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

module.exports = function(asset, callback) {
	try {
		var startTime = new Date();

		var warnings = [];
		UglifyJS.AST_Node.warn = function(text, properties) {
			properties.message = UglifyJS.string_template(text, properties);
			delete properties.file;
			warnings.push(properties);
		};

		var initialAST = UglifyJS.parse(asset.content, {
			filename: asset.path
		});

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

		asset.dependencies = Object.keys(dependencies).sort();
		asset.content = code.toString();
		asset.sourceMap = sourceMap.toString();

		var endTime = new Date();
		asset.transforms = (asset.transforms || []).concat([{
			name: 'javaScriptMinify',
			time: endTime - startTime,
			warnings: warnings.length > 0 ? warnings : undefined
		}]);

		callback(null, asset);
	} catch (error) {
		if (error instanceof UglifyJS.JS_Parse_Error) {
			console.error('ERR: Parse error at ' + asset.path + ':' + error.line + ',' + error.col + ': ' + error.message + '\n' + error.stack);
		}

		var reportedError = new Error('Could not minify JS.');
		reportedError.cause = error;
		callback(reportedError, asset);
	}
};
