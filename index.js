var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    mime = require('mime');
	
var getEncoding = function(buffer, opts) {
	var binaryEncoding, charCode, chunkBegin, chunkEnd, chunkLength, contentChunkUTF8, encoding, i, textEncoding, _i, _ref;
	textEncoding = 'utf8';
	binaryEncoding = 'binary';
	if (opts == null) {
		chunkLength = 24;
		encoding = getEncoding(buffer, {
			chunkLength: chunkLength,
			chunkBegin: chunkBegin
		});
		if (encoding === textEncoding) {
			chunkBegin = Math.max(0, Math.floor(buffer.length / 2) - chunkLength);
			encoding = getEncoding(buffer, {
				chunkLength: chunkLength,
				chunkBegin: chunkBegin
			});
			if (encoding === textEncoding) {
				chunkBegin = Math.max(0, buffer.length - chunkLength);
				encoding = getEncoding(buffer, {
					chunkLength: chunkLength,
					chunkBegin: chunkBegin
				});
			}
		}
	} else {
		chunkLength = opts.chunkLength, chunkBegin = opts.chunkBegin;
		if (chunkLength == null) {
			chunkLength = 24;
		}
		if (chunkBegin == null) {
			chunkBegin = 0;
		}
		chunkEnd = Math.min(buffer.length, chunkBegin + chunkLength);
		contentChunkUTF8 = buffer.toString(textEncoding, chunkBegin, chunkEnd);
		encoding = textEncoding;
		for (i = _i = 0, _ref = contentChunkUTF8.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
			charCode = contentChunkUTF8.charCodeAt(i);
			if (charCode === 65533 || charCode <= 8) {
				encoding = binaryEncoding;
				break;
			}
		}
	}
	return encoding;
};

module.exports = {
	handleRequest: function(request, response, config) {
		config = config || { showUserAgentSelection: true };
		
		if (!config.directoryRoot) {
			config.directoryRoot = '';
		}
		
		var uri = url.parse(request.url).pathname;
		
		uri = uri.replace(config.directoryRoot, '');
		
		var filename = path.join(__dirname, 'client', uri);
		
		fs.exists(filename, function (exists) {
			if (!exists) {
				response.writeHead(404, {
					'Content-Type': 'text/plain'
				});
				response.write("404 Not Found\n");
				response.end();
				return;
			}
			if (fs.statSync(filename).isDirectory()) filename += '/index.html';
			fs.readFile(filename, 'binary', function (err, file) {
				if (err) {
					response.writeHead(500, {
						'Content-Type': 'text/plain'
					});
					response.write(err + "\n");
					response.end();
					return;
				}
				response.writeHead(200, {
					'Content-Type': mime.lookup(filename)
				});
				file = file.replace(/\{\{directoryRoot\}\}/g, config.directoryRoot);
				file = file.replace(/\{\{showUserAgentSelection\}\}/g, (config.showUserAgentSelection ? 'true' : 'false'));
				
				response.write(file, getEncoding(file));
				response.end();
			});
		});
	}
};