define([
	'jquery',
	'plugins/spinner',
], function($) {
	function Preview(container, id) {
		var _this = this;
		this.event = $({});
		this.id = id;
		this.page = 1;
		this.container = container;
		this.iframe = container.find('iframe');
		this.controls = container.find('.preview_controls');

		this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide();

		this.error = $('.preview_error');
		this.container.prepend(this.spinner);

		window.addEventListener('message', function(event) {
			if (event.origin !== document.location.origin) return;
			switch (event.data.type) {
				case 'loaded':
					_this.spinner.hide();
					break;
				case 'scroll':
					_this.event.trigger('preview:scroll', event.data);
					break;
			}
		}, false);
	}
	Preview.prototype.load = function(score) {
		var _this = this;
		this.spinner.show();
		this.error.hide();
		this.resize();
		score.id = this.id;
		$.post('/prepare_preview', score, function(response) {
			_this.handleResponse(response);
		}, 'json').fail(function(jqXHR, textStatus, errorThrown) {
			switch (textStatus) {
				case 'error':
					error = 'Connection failed: ' + jqXHR.status;
					error += ' ' + jqXHR.statusText;
					break;
				case 'timeout':
					error = 'Connection timeout: ' + errorThrown;
					break;
				case 'abort':
					error = 'Connection aborted: ' + errorThrown;
					break;
				case 'parsererror':
					error = 'Unable to parse response:\n' + errorThrown;
					error += '\nResponse:\n' + jqXHR.responseText;
			}
			_this.handleResponse({ error: error });
		});
	};
	Preview.prototype.handleResponse = function(data) {
		var _this = this;
		if (data.error) {
			this.spinner.hide();
			this.error.show().find('.message').text(data.error);
			this.resize();
			return false;
		}
		this.cacheBuster = '?t=' + new Date().getTime();
		this.id = data.id;
		this.setPdfSrc();
	};
	Preview.prototype.setPdfSrc = function() {
		var msg = {
			id: this.id,
			url: 'https://s3-us-west-2.amazonaws.com/lilybin-scores/' + this.id + '.pdf' + this.cacheBuster
		};
		this.iframe[0].contentWindow.postMessage(
			msg,
			document.location.origin
		);
	};
	Preview.prototype.resize = function() {
		this.iframe.css({
			height: this.container.height() - this.error[0].offsetHeight + 'px'
		});
	};
	return Preview;
});
