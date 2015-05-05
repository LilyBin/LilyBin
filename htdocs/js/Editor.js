define([
	'jquery',
	'CodeMirror/lib/codemirror'
], function($, CodeMirror) {
	function Editor(container, options) {
		this.event = $({});
		
		this.container = $(container).append(
			this.tabUl = $('<ul />').addClass('tab_bar').mousewheel(function(e, delta, deltaX, deltaY) {
				if (deltaY < 0 || deltaX > 0) $(this).find('.selected + li button.tab').click();
				if (deltaY > 0 || deltaX < 0) $(this).find('.selected').prev().find('button.tab').click();
				e.preventDefault();
				return false;
			}),
			
			this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide()
		);
		
		if (options.showTabs) this.container.addClass('show_tabs');
		
		this.openFile('', '');
		this.blank = true;
	}
	Editor.prototype.openFile = function(path, contents, loadPreview) {
		var _this = this, codemirrorContainer, codemirrorInstance, li;
		
		if (this.blank) {
			this.tabUl.empty();
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
		
		this.tabUl.find('li').removeClass('selected');
		this.tabUl.append(
			li = $('<li />').addClass('selected').append(
				$('<button />').addClass('tab')
				.text(path.split('/').slice(-1)[0] || 'Untitled')
				.prepend($('<span>*&nbsp;</span>').addClass('unsaved_changes_indicator'))
				.click(function(e) {
					_this.switchToTab(li);
				}),
				
				$('<button />').text('×').addClass('close_button').click(function(e) {
					var selLi = li.prev();
					if (!selLi.length) selLi = li.next();
					
					function removeTab() {
						li.remove();
						codemirrorContainer.remove();
					
						if (li.hasClass('selected') && selLi.length) {
							_this.switchToTab(selLi);
						}
					
						if (!selLi.length) {
							_this.openFile('', '');
							_this.blank = true;
						}
					}
					
					if (codemirrorInstance.unsavedChanges)
						_this.confirm('<h3>You have unsaved changes.</h3><p>Are you sure you wish to close <strong>' + (path.split('/').slice(-1)[0] || 'Untitled') + '</strong>?</p>', ['Don\'t Close', 'Close Without Saving'], function() { removeTab(); })
					else removeTab();
				})
			).data({tabBody: codemirrorContainer, path: path, codemirrorInstance: codemirrorInstance})
		);
		
		codemirrorContainer.find('.CodeMirror').css({height: $(window).height() - $('#header').outerHeight() - $('#code_container').find('.tab_bar').outerHeight() + 'px'});
		if (loadPreview) this.loadPreview();
	}
	Editor.prototype.getValue = function() {
		return this.container.children('.codemirror_container:visible').data('codemirrorInstance').getValue();
	};
	Editor.prototype.getPath = function() {
		return this.tabUl.find('li.selected').data('path');
	};
	Editor.prototype.getCurrentTab = function() {
		return this.tabUl.find('li.selected');
	};
	Editor.prototype.loadPreview = function() {
		this.event.trigger('editor:preview', this.getValue);
	};
	Editor.prototype.save = function() {
		this.spinner.show();
		this.event.trigger('editor:save', this.getValue);
	};
	Editor.prototype.switchToTab = function(li) {
		li = $(li);
		this.tabUl.find('li').removeClass('selected');
		this.container.find('.codemirror_container').hide();
		li.addClass('selected');
		li.data('tabBody').show();
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
