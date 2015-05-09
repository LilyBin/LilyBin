require.config({
	paths: {
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min'
	}
});

require([
	'jquery',
	'Preview',
	'Editor',
	'plugins/splitter',
	'plugins/tipTip'
], function($, Preview, Editor) {
	$(function() {
		function loadPreview() {
			preview.load({code: editor.getValue(), version: $('#version_select_menu input[name=version]:checked').val()});
		}

		function save() {
			$.post('/save', {id: score.id, code: editor.getValue(), version: $('#version_select_menu input[name=version]:checked').val()}, function(response) {
				window.location = '/' + response.id + '/' + response.revision;
			}, 'json');
		}

		var editor = new Editor($('#code_container'));
		editor.event.bind({ 'editor:preview': loadPreview,
		                    'editor:save'   : save });
		
		editor.openFile('', score.code);

		var mainHeight = $(window).height() - $('#header').outerHeight();
				
		$('#main').css({height: mainHeight + 'px', width: $(window).width()});
		$('.CodeMirror').css({height: mainHeight + 'px'});
		$('.CodeMirror-gutters').css({height: mainHeight + 'px'});
		$('#preview_container').css({height: mainHeight + 'px'});
		$('#code_container').css({width: $('#code_container').parent().width() + 'px', left: '0px'});
		$('#donate_button_label').css({width: $('#header').width() - $('donate_button_label').outerWidth() - $('#header h1').outerWidth() - $('#actions').outerWidth() - 200 + 'px'});
		$(window).resize(function() {
			var mainHeight = $(window).height() - $('#header').outerHeight();

			$('#main').css({width: $(window).width()});
			$('#preview_container').css({width: $('#main').width() - $('#left_pane').width() - $('.vsplitbar').width()});
			$('#code_container').css({width: $('#code_container').parent().width() + 'px', left: '0px'});
			$('#preview_container, .vsplitbar, #main, #left_pane').css({height: mainHeight + 'px'});
			$('.CodeMirror').css({height: mainHeight + 'px'});
			$('.CodeMirror-gutters').css({height: mainHeight + 'px'});
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
