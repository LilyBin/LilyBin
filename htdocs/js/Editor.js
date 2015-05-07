define([
	'jquery',
	'CodeMirror/lib/codemirror'
], function($, CodeMirror) {
	function Editor(container, options) {
		this.event = $({});
		
		this.container = $(container).append(
			this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide()
		);
		
		this.openFile('', '');
		this.blank = true;
	}
	Editor.prototype.openFile = function(path, contents, loadPreview) {
		var _this = this, codemirrorContainer, codemirrorInstance, li;
		
		if (this.blank) {
			this.container.children('.codemirror_container').remove();
			this.blank = false;
		}

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
				'Ctrl-Enter': _.bind(this.loadPreview, this),
				'Ctrl-S': _.bind(this.save, this)
			},
			onChange: function() {
				_this.blank = false;
				codemirrorInstance.unsavedChanges = true;
				li.addClass('unsaved_changes');
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
	Editor.prototype.confirm = function(message, buttonLabels, cb) {
		var _this = this, dimmer, dialogContainer;
		
		$(document.body).append(
			dimmer = $('<div />').addClass('dimmer'),
			dialogContainer = $('<div />').addClass('dialog_container')
				.html(message)
				.append(
					$('<button />').text(buttonLabels[0]).click(function(e) { dimmer.remove(); dialogContainer.remove(); }),
					$('<button />').text(buttonLabels[1]).click(function(e) {
						dimmer.remove();
						dialogContainer.remove();
						cb();
					})
				)
		);
		dialogContainer.css({top: $(window).height() / 2 - dialogContainer.outerHeight() / 2, left: $(window).width() / 2 - dialogContainer.outerWidth() / 2});
	};
	Editor.prototype.reportSuccessfulSave = function(li) {
		this.spinner.hide();
		li.removeClass('unsaved_changes');
		li.data('codemirrorInstance').unsavedChanges = false;
	};
	
	return Editor;
})
