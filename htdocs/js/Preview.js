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

		var error = $('.preview_error');
		this.error = {
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
					_this.event.trigger('preview:scroll', event.data);
					break;
				case 'error':
					_this.error.message.textContent = event.data.text;
					_this.error.show('Error', 'danger');
					break;
				case 'log':
					_this.error[event.data.visible ? 'show' : 'hide']('Compile Log', '');
					break;
			}
		}, false);
	}
	Preview.prototype.load = function(score) {
		var _this = this;
		this.spinner.show();
		this.error.hide();
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
		this.error.message.textContent = data.error || data.output;
		if (data.error) {
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
