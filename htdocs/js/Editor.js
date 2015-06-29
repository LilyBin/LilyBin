define([
	'jquery',
	'CodeMirror/lib/codemirror',
	'CodeMirror/mode/stex/stex.min',
	'CodeMirror/addon/edit/matchbrackets.min',
	'plugins/spinner'
], function($, CodeMirror) {
	function Editor($container, options) {
		var _this = this;
		this.event = $({});

		this.$container = $container.prepend(
			this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide()
		);
		this.textarea = document.getElementById('code');
		this.cm = CodeMirror.fromTextArea(this.textarea, {
			lineNumbers: true,
			fixedGutter: true,
			matchBrackets: true,
			indentUnit: 4,
			tabSize: 4,
			indentWithTabs: true,
			extraKeys: {
				'Ctrl-Enter': this.loadPreview.bind(this),
				'Ctrl-S': this.save.bind(this)
			}
		});
		this.cm.on('change', function() {
			_this.event.trigger('change');
		});
	}
	Editor.prototype.openFile = function(contents, loadPreview) {
		this.cm.setValue(contents);
		if (loadPreview) this.loadPreview();
	}
	Editor.prototype.getValue = function() {
		this.cm.save();
		return this.textarea.value;
	};
	Editor.prototype.undo = function() {
		return this.cm.undo();
	}
	Editor.prototype.redo = function() {
		return this.cm.redo();
	}
	Editor.prototype.loadPreview = function() {
		this.event.trigger('preview');
	};
	Editor.prototype.save = function() {
		this.spinner.show();
		this.event.trigger('save');
	};
	Editor.prototype.reset = function() {
		this.cm.setValue('');
	};
	// line: the <line>th line from top.
	// char: the <char>th character of the line.
	Editor.prototype.scrollTo = function(line, char) {
		return this.cm.doc.setCursor(line - 1, char);
	};
	Editor.prototype.focus = function() {
		return this.cm.focus();
	};

	return Editor;
})
