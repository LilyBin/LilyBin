define([
	'jquery',
	'CodeMirror/lib/codemirror',
	'CodeMirror/mode/stex/stex',
	'CodeMirror/addon/edit/matchbrackets'
], function($, CodeMirror) {
	function Editor(container, options) {
		this.event = $({});
		
		this.container = $(container).append(
			this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide()
		);
		
		this.openFile('', '');
	}
	Editor.prototype.openFile = function(path, contents, loadPreview) {
		var _this = this, codemirrorContainer, codemirrorInstance, li;
		
		this.container.find('.codemirror_container').hide();
		this.container.append(codemirrorContainer = $('<div />').addClass('codemirror_container'));
		
		codemirrorInstance = CodeMirror(codemirrorContainer[0], {
			value: contents || '',
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
		
		codemirrorContainer.data('codemirrorInstance', codemirrorInstance);
		codemirrorContainer.data('path', path);
		
		codemirrorContainer.find('.CodeMirror').css({height: $(window).height() - $('#header').outerHeight() + 'px'});
		if (loadPreview) this.loadPreview();
	}
	Editor.prototype.getValue = function() {
		return this.container.children('.codemirror_container:visible').data('codemirrorInstance').getValue();
	};
	Editor.prototype.loadPreview = function() {
		this.event.trigger('editor:preview', this.getValue);
	};
	Editor.prototype.save = function() {
		this.spinner.show();
		this.event.trigger('editor:save', this.getValue);
	};
	
	return Editor;
})
