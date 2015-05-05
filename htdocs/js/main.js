require.config({
	paths: {
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min'
	}
});

require(['jquery', 'Preview', 'Editor', 'DropboxBrowser', 'underscore', 'CodeMirror/lib/codemirror', 'CodeMirror/mode/stex/stex', 'CodeMirror/addon/edit/matchbrackets', 'plugins/splitter', 'plugins/tipTip'], function($, Preview, Editor, DropboxBrowser) {
	$(function() {
		function loadPreview() {
			preview.load({code: editor.getValue(), version: $('#version_select_menu input[name=version]:checked').val()});
		}

		function save() {
			if (accountInfo) {
				var path = editor.getPath(),
					li = editor.getCurrentTab();
			
				$.post('/dropbox_save', {
					path: path,
					contents: editor.getValue(),
					version: $('#version_select_menu input[name=version]:checked').val()
				}, function(response, status) {
					editor.reportSuccessfulSave(li)
				});
			} else {
				$.post('/save', {code: editor.getValue(), id: score.id, version: $('#version_select_menu input[name=version]:checked').val()}, function(response) {
					window.location = '/' + response.id + '/' + response.revision;
				}, 'json');
			}
		}

		var editor = new Editor($('#code_container'), {
			showTabs: !!accountInfo
		});
		editor.event.bind({ 'editor:preview': loadPreview,
		                    'editor:save'   : save });
		
		// Logged in to Dropbox
		if (accountInfo) {
			$('#dropbox_login').hide();
			$('#dropbox_logout').show();
			
			var dropboxBrowser = new DropboxBrowser($('#file_browser'), {
				editor: editor
			});
			$('#file_browser').show();
		} else { // Not logged in
			editor.openFile('', score.code);
			$('#dropbox_logout').hide();
			$('#dropbox_login').show();
		}

		var mainHeight = $(window).height() - $('#header').outerHeight(),
			tabUlHeight = $('#code_container').find('.tab_bar:visible').outerHeight(),
			fbWidth = $('#file_browser:visible').outerWidth() ? $('#file_browser:visible').outerWidth() : 0;
				
		$('#main').css({height: mainHeight + 'px', width: $(window).width()});
		$('.CodeMirror').css({height: mainHeight - tabUlHeight + 'px'});
		$('.CodeMirror-gutters').css({height: mainHeight - tabUlHeight + 'px'});
		$('#preview_container').css({height: mainHeight + 'px'});
		$('#code_container').css({width: $('#code_container').parent().width() - fbWidth + 'px', left: fbWidth + 'px'});
		$('#donate_button_label').css({width: $('#header').width() - $('donate_button_label').outerWidth() - $('#header h1').outerWidth() - $('#actions').outerWidth() - 200 + 'px'});
		$(window).resize(function() {
			var mainHeight = $(window).height() - $('#header').outerHeight(),
				fbWidth = $('#file_browser:visible').outerWidth() ? $('#file_browser:visible').outerWidth() : 0;

			$('#main').css({width: $(window).width()});
			$('#preview_container').css({width: $('#main').width() - $('#left_pane').width() - $('.vsplitbar').width()});
			$('#code_container').css({width: $('#code_container').parent().width() - fbWidth + 'px', left: fbWidth + 'px'});
			$('#preview_container, .vsplitbar, #main, #left_pane').css({height: mainHeight + 'px'});
			$('.CodeMirror').css({height: mainHeight - tabUlHeight + 'px'});
			$('.CodeMirror-gutters').css({height: mainHeight - tabUlHeight + 'px'});
			$('#donate_button_label').css({width: $('#header').width() - $('donate_button_label').outerWidth() - $('#header h1').outerWidth() - $('#actions').outerWidth() - 200 + 'px'});
		});

		var previewWidth = $(window).width() * .4;
		if (previewWidth < 730) previewWidth = 730;
		$('#main').splitter({
			sizeRight: previewWidth
		});

		$('#version_select_menu input').val([score.version]);

		var preview = new Preview($('#preview_container'), score.id);
	
		$('#preview_button').click(loadPreview);

		var open = false;
		$('#preview_options_button').click(function(e) {
			open = !open;
			$(this).addClass('active');
			$('#version_select_menu').show();
			if (open) {
				e.stopPropagation();
				return false;
			}
		});
		$('#version_stable, #version_unstable').change(function() { loadPreview(); });
		$(document).click(function() {
			open = false;
			$('#version_select_menu').hide();
			$('#preview_options_button').removeClass('active');
		});

		$('#save_button').click(save);

		$('#share_button').click(function() {
			$('#share_menu').toggle();
		});
		$('#share_menu .close').click(function() {
			$('#share_menu').hide();
		});
		$('#share_url').val(window.location.href).focus(function() { $(this).select(); });
		$('.facebook_share_button').click(function() {
			newWindow = window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '&t=' + encodeURIComponent('LilyPond Score'), 'Share', 'width=660,height=380');
			if (window.focus) newWindow.focus();
			return false;
		});

		$('#preview_button, #save_button').tipTip({ delay: 0 });
		
		if (editor.getValue()) loadPreview();
	});
});
