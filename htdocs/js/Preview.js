define([
	'jquery',
	'plugins/spinner',
], function($) {
	var STAGE = 'https://7icpm9qr6a.execute-api.us-west-2.amazonaws.com/prod/';

	function Preview(container, id) {
		var _this = this;
		this.event = $({});
		this.id = id;
		this.page = 1;
		this.container = container;
		this.iframe = container.find('iframe');
		this.controls = container.find('.preview_controls');

		this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide();

		var error = $('.preview_error');
		this.error = {
			dontHide: false,
			$parent: error,
			inner: error.find('div')[0],
			title: error.find('h3')[0],
			message: error.find('pre')[0],
			show: function(title, newClass) {
				this.$parent.show();
				this.title.textContent = title;
				if (newClass === undefined) return this;
				var classes = this.title.classList;
				for (var i = 0; i < classes.length; i++) {
					if (/^text-/.test(classes[i])) {
						classes.remove(classes[i]);
						classes.add('text-' + newClass);
						break;
					}
				}
				classes = this.inner.classList;
				for (var i = 0; i < classes.length; i++) {
					if (/^bg-/.test(classes[i])) {
						classes.remove(classes[i]);
						classes.add('bg-' + newClass);
						break;
					}
				}
				_this.resize();
				return this;
			},
			hide: function() {
				this.$parent.hide();
				_this.resize();
				return this;
			}
		};
		this.container.prepend(this.spinner);

		window.addEventListener('message', function(event) {
			if (event.origin !== document.location.origin) return;
			switch (event.data.type) {
				case 'loaded':
					_this.spinner.hide();
					break;
				case 'scroll':
					_this.event.trigger('scroll', event.data);
					break;
				case 'error':
					_this.error.message.textContent = event.data.text;
					_this.error.show('Error', 'danger');
					break;
				case 'log':
					_this.error.dontHide = event.data.visible;
					_this.error[event.data.visible ? 'show' : 'hide']('Compile Log', '');
					break;
			}
		}, false);
	}
	Preview.prototype.load = function(score, callback) {
		var _this = this;
		this.spinner.show();
		score.id = this.id;
		$.ajax({
			type: 'POST',
			url: STAGE + 'prepare_preview/' + score.version,
			contentType: 'application/json; charset=utf-8',
			data: JSON.stringify(score),
			dataType: 'json',
		}).then(function (response) {
			_this.handleResponse(response);
			callback(null, response);
		}, function(jqXHR, textStatus, errorThrown) {
			switch (textStatus) {
				case 'error':
					var response = jqXHR.responseJSON;
					if (response && response.errorMessage) {
						_this.handleResponse(response);
						callback(null, response);
						return;
					}
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
			_this.handleResponse({ errorMessage: error });
			callback(new Error(error));
		});
	};
	Preview.prototype.handleResponse = function(data) {
		var _this = this;
		if (data.errorMessage) {
			this.error.message.textContent = data.errorMessage;
			this.spinner.hide();
			this.error.show('Error', 'danger');
			this.notifyCompFailed();
			return false;
		}
		this.cacheBuster = '?t=' + new Date().getTime();
		this.id = data.id;
		this.files = data.files;
		if (!data.files.pdf) {
			this.spinner.hide();
			this.error.message.textContent =
				'Compilation successful but no PDF generated.\n' +
				'Please add `\\layout{}` to the `\\score` block.';
			this.error.show('Error', 'danger');
			return;
		}
		if (!this.error.dontHide) this.error.hide();
		this.setPdfSrc();
	};
	Preview.prototype.setPdfSrc = function() {
		var msg = {
			id: this.id,
			url: 'https://s3-us-west-2.amazonaws.com/lilybin-scores/' + this.id + '.pdf' + this.cacheBuster,
			midi: this.files.midi
		};
		this.iframe[0].contentWindow.postMessage(
			msg,
			document.location.origin
		);
	};
	Preview.prototype.notifyCompFailed = function() {
		var msg = {
			error: true
		};
		this.iframe[0].contentWindow.postMessage(
			msg,
			document.location.origin
		);
	};
	Preview.prototype.resize = function() {
		this.iframe.css({
			height: this.container.height() - this.error.$parent[0].offsetHeight + 'px'
		});
	};
	return Preview;
});
