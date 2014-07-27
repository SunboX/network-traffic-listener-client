require.config({
    baseUrl: '{{directoryRoot}}'
});

require([
	'ace/ace',
	'ace/theme/textmate',
	'ace/mode/xml', 'ace/mode/html',
	'ace/mode/css',
	'ace/mode/javascript',
	'ace/mode/text',
	'ace/mode/json'
], function(
	ace,
	aceTheme,
	aceXml,
	aceHtml,
	aceCss,
	aceJavaScript,
	aceText,
	aceJson
) {

	if (!('EventSource' in window)) {
		alert('Your Browser doesn\'t support EventSource');
	}

	if (!String.prototype.trim) {
		String.prototype.trim = function() {
			return this
				.replace(/^\s+|\s+$/g, '')
				.replace(/[\r\n]+/, '\n');
		};
	}

	if (!HTMLElement.prototype.empty) {
		HTMLElement.prototype.empty = function() {
			while (this.firstChild) {
				this.removeChild(this.firstChild);
			}
		}
	}

	var self = this,
		recievedUserAgents = [],
		selectedUserAgent, selectedSession,
		userAgents = document.getElementById('user-agents'),
		sessionList = document.getElementById('session-list').querySelector('tbody'),
		requestHeaders = document.getElementById('request-headers'),
		requestQuery = document.getElementById('request-query'),
		responseHeaders = document.getElementById('response-headers'),
		editorOptions = {
			readOnly: true,
			showPrintMargin: false,
			highlightActiveLine: false,
			highlightGutterLine: true
		};

	self.requestBody = document.getElementById('request-body');
	self.responseBody = document.getElementById('response-body');
	self.requestEditor = ace.edit('request-body');
	self.responseEditor = ace.edit('response-body');
	self.requestImage = document.getElementById('request-image');
	self.responseImage = document.getElementById('response-image');
	self.requestImageScroller = document.getElementById('request-image-scroller');
	self.responseImageScroller = document.getElementById('response-image-scroller');

	self.requestEditor.setTheme('ace/theme/textmate');
	self.requestEditor.setOptions(editorOptions)
	self.requestEditor.renderer.$cursorLayer.element.style.opacity = 0;
	self.requestEditor.commands.commandKeyBinding = {};
	self.responseEditor.setTheme('ace/theme/textmate');
	self.responseEditor.setOptions(editorOptions)
	self.responseEditor.renderer.$cursorLayer.element.style.opacity = 0;
	self.responseEditor.commands.commandKeyBinding = {};
	
	if (config.showUserAgentSelection) {
		document.getElementById('home-screen').hidden = false;
	}
	else {
		document.getElementById('clear-session-btn').hidden = false;
		document.getElementById('session-screen').hidden = false;
	}

	function clearAllSessionsLogs() {
		sessionList.empty();
		selectedUserAgent = null;
		selectedSession = null;
		self.requestEditor.setValue('');
		self.responseEditor.setValue('');
		self.requestImageScroller.hidden = true;
		self.responseImageScroller.hidden = true;
		requestHeaders.empty();
		responseHeaders.empty();
	}

	document.getElementById('start-session').addEventListener('click', function() {

		selectedUserAgent = userAgents.options[userAgents.selectedIndex].value;

		document.getElementById('home-screen').hidden = true;
		document.getElementById('session-screen').hidden = false;
		document.getElementById(config.showUserAgentSelection ? 'close-session-screen-btn' : 'clear-session-btn').hidden = false;
	});

	document.getElementById('close-session-screen-btn').addEventListener('click', function() {

		document.getElementById('home-screen').hidden = false;
		document.getElementById('session-screen').hidden = true;
		document.getElementById('close-session-screen-btn').hidden = true;

		clearAllSessionsLogs();
	});

	document.getElementById('clear-session-btn').addEventListener('click', function() {
		clearAllSessionsLogs();
	});

	var tabPanels = document.querySelectorAll('.tabs');
	for (var i = 0, ilen = tabPanels.length; i < ilen; i++) {
		var tabs = tabPanels[i].querySelectorAll('section > h2');
		for (var j = 0, jlen = tabs.length; j < jlen; j++) {
			if (j == 0) {
				tabs[0].parentNode.classList.add('current');
			}
			tabs[j].addEventListener('click', function() {
				var sections = this.parentNode.parentNode.querySelectorAll('section'),
					section = this.parentNode;
				for (var k = 0, klen = sections.length; k < klen; k++) {
					sections[k].classList.remove('current');
				}
				section.classList.add('current');
			});
		}
	}

	function showInfo(info, type, mimetype) {
		var editor = self[type + 'Editor'];
		switch (mimetype) {
			case 'xml':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceXml.Mode);
				editor.setValue(vkbeautify.xml(info.body.trim()), -1);
				break;
			case 'html':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceHtml.Mode);
				editor.setValue(html_beautify(info.body.trim()), -1);
				break;
			case 'javascript':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceJavaScript.Mode);
				editor.setValue(js_beautify(info.body.trim()), -1);
				break;
			case 'css':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceCss.Mode);
				editor.setValue(css_beautify(info.body.trim()), -1);
				break;
			case 'json':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceJson.Mode);
				editor.setValue(vkbeautify.json(info.body.trim()), -1);
				break;
			case 'text':
				self[type + 'Body'].hidden = false;
				editor.getSession().setMode(new aceText.Mode);
				editor.setValue(info.body, -1);
				break;
			case 'png':
			case 'jpeg':
			case 'gif':
			case 'svg':
			case 'ico':
				self[type + 'Image'].src = 'data:image/' + mimetype + ';base64,' + info.bodyBase64;
				self[type + 'ImageScroller'].hidden = false;
				break;
		}
	}

	var mimeTypeMapping = {
		'xml': /text\/xml.*/,
		'html': /text\/html.*/,
		'javascript': /text\/javascript.*/,
		'javascript': /application\/javascript.*/,
		'json': '/application\/json.*/',
		'css': /text\/css.*/,
		'text': /text\/plain.*/,
		'png': /image\/png.*/,
		'jpeg': /image\/jpg.*/,
		'jpeg': /image\/jpeg.*/,
		'gif': /image\/gif.*/,
		'svg': /image\/svg.*/,
		'ico': /image\/x-icon.*/
	};

	function createTd(tr, text, className) {
		var td = document.createElement('td');
		if (className) {
			td.classList.add(className);
		}
		textEl = document.createTextNode(text);
		td.appendChild(textEl);
		tr.appendChild(td);
	}

	function showSessionInfo(session) {

		self.requestBody.hidden = true;
		self.requestImageScroller.hidden = true;
		self.requestImage.src = '';

		self.responseBody.hidden = true;
		self.responseImageScroller.hidden = true;
		self.responseImage.src = '';

		if (session.request.headers['content-type']) {
			var found = false;
			for (var type in mimeTypeMapping) {
				if (session.request.headers['content-type'].match(mimeTypeMapping[type])) {
					showInfo(session.request, 'request', type);
					found = true;
					break;
				}
			}
			if (!found && session.request.body.trim().length > 0) {
				showInfo(session.request, 'request', 'text');
			}
		}

		if (session.response.headers['content-type']) {
			var found = false;
			for (var type in mimeTypeMapping) {
				if (session.response.headers['content-type'].match(mimeTypeMapping[type])) {
					showInfo(session.response, 'response', type);
					found = true;
					break;
				}
			}
			if (!found && session.response.body.trim().length > 0) {
				showInfo(session.response, 'response', 'text');
			}
		}

		requestQuery.empty();

		for (var key in session.request.query) {
			var tr = document.createElement('tr');

			createTd(tr, key);
			createTd(tr, session.request.query[key]);

			requestQuery.appendChild(tr);
		}

		requestHeaders.empty();

		for (var key in session.request.headers) {
			var tr = document.createElement('tr');

			createTd(tr, key);
			createTd(tr, session.request.headers[key]);

			requestHeaders.appendChild(tr);
		}

		responseHeaders.empty();

		for (var key in session.response.headers) {
			var tr = document.createElement('tr');

			createTd(tr, key);
			createTd(tr, session.response.headers[key]);

			responseHeaders.appendChild(tr);
		}
	}

	var source = new EventSource('/debugger-listen');

	source.addEventListener('user-agent-found', function(e) {
		var userAgent = JSON.parse(e.data),
			ipAndName = userAgent.remoteAddress + ' | ' + userAgent.name;

		if (recievedUserAgents.indexOf(ipAndName) > -1) {
			return;
		}
		recievedUserAgents.push(ipAndName);
		var option = document.createElement('option'),
			text = document.createTextNode(ipAndName);

		option.value = userAgent.remoteAddress;
		option.appendChild(text);
		userAgents.appendChild(option);
	});

	source.addEventListener('session-info', function(e) {
		var sessionInfo = JSON.parse(e.data);

		if (sessionInfo.request.remoteAddress != selectedUserAgent) {
			return;
		}

		var tr = document.createElement('tr');

		tr.dataset.session = e.data;
		tr.addEventListener('click', function() {
			selectedSession = this;
			var sessions = sessionList.querySelectorAll('tr');
			for (var i = 0, len = sessions.length; i < len; i++) {
				sessions[i].classList.remove('current');
			}
			tr.classList.add('current');
			showSessionInfo(JSON.parse(this.dataset.session));
		});
		if (sessionInfo.response['status-code'] == 500) {
			tr.classList.add('http500');
		}

		createTd(tr, sessionInfo.response['status-code']);
		createTd(tr, sessionInfo.request.headers.host);
		createTd(tr, sessionInfo.request.pathname);
		createTd(tr, sessionInfo.response.responseTime + ' ms', 'right');
		createTd(tr, sessionInfo.response.transferTime + ' ms', 'right');
		createTd(tr, sessionInfo.response.totalTime + ' ms', 'right');

		sessionList.appendChild(tr);

		if (!selectedSession) {
			var sessions = sessionList.querySelectorAll('tr');
			for (var i = 0, len = sessions.length; i < len; i++) {
				sessions[i].classList.remove('current');
			}
			tr.classList.add('current');
			showSessionInfo(sessionInfo);
		}
	});

	document.addEventListener('keydown', function(e) {
		e = e || window.event;
		var sessions = Array.prototype.slice.call(sessionList.querySelectorAll('tr')),
			current = selectedSession ? sessions.indexOf(selectedSession) : sessions.length - 1;

		for (var i = 0, len = sessions.length; i < len; i++) {
			sessions[i].classList.remove('current');
		}

		switch (e.keyCode) {

			case 27:
				break;

			case 38:
				// up arrow
				if (current < 1) {
					selectedSession = sessions[sessions.length - 1];
				} else {
					selectedSession = sessions[current - 1];
				}
				break;

			case 40:
				// down arrow
				if (current >= sessions.length - 1) {
					selectedSession = sessions[0];
				} else {
					selectedSession = sessions[current + 1];
				}
				break;
		}
		selectedSession.classList.add('current');
		showSessionInfo(JSON.parse(selectedSession.dataset.session));
	});

	document.addEventListener('keydown', function(e) {
		e = e || window.event;

		switch (e.keyCode) {

			case 27:
				// escape key
				selectedUserAgent = null;
				selectedSession = null;

				if (config.showUserAgentSelection) {
					document.getElementById('home-screen').hidden = false;
					document.getElementById('session-screen').hidden = true;
					document.getElementById('close-session-screen-btn').hidden = true;
				}

				clearAllSessionsLogs();
				break;
		}
	});
});

