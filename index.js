var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    mime = require('mime');

module.exports = {
	handleRequest: function(request, response, directoryRoot) {
		var uri = url.parse(request.url).pathname.replace(directoryRoot, ''),
			filename = path.join(__dirname, 'client', uri);
		
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
				file = file.replace(/\{\{directoryRoot\}\}/g, directoryRoot);
				response.write(file, 'binary');
				response.end();
			});
		});
	}
};