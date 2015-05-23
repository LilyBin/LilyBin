require.config({
	shim: {
		'bootstrap': {
			deps: [
				'jquery'
			]
		}
	},
	paths: {
		jquery: 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min',
		bootstrap: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min'
	}
});

require([
	'jquery',
	'Preview',
	'Editor',
	'bootstrap'
], function($, Preview, Editor) {
	$(function() {
		var versionState = score.version || 'stable';

		function loadPreview() {
			preview.load({code: editor.getValue(), version: versionState});
		}

		function save() {
			$.post('/save', {id: score.id, code: editor.getValue(), version: versionState}, function(response) {
				window.location = '/' + response.id + '/' + response.revision;
			}, 'json');
		}

		var editor = new Editor($('#code_container'));
		editor.event.bind({ 'editor:preview': loadPreview,
		                    'editor:save'   : save });

		editor.openFile(score.code);

		var mainHeight = $(window).height() - $('#header').outerHeight();
		var mainWidth  = $(window).width();
		// Corresponds with Bootstrap's xs
		var xs = mainWidth < 768;

		$('a.noop-a').click(function (e) {
			e.preventDefault();
		});
		var cm   = $('.CodeMirror, .CodeMirror-gutters')
			.css({height: (xs ? mainHeight * (5/12) : mainHeight) + 'px'});
		var main = $('#main').children()
			.css({height: (xs ? mainHeight * (7/12) : mainHeight) + 'px'});
		$(window).resize(function() {
			var mainHeight = $(window).height() - $('#header').outerHeight();
			var mainWidth  = $(window).width();
			// Corresponds with Bootstrap's xs
			var xs = mainWidth < 768;

			cm  .css({height: (xs ? mainHeight * (5/12) : mainHeight) + 'px'});
			main.css({height: (xs ? mainHeight * (7/12) : mainHeight) + 'px'});
		});

		var preview = new Preview($('#preview_container'), score.id);

		$('#preview_button').click(loadPreview);

		var capitalized = { unstable: 'Unstable', stable: 'Stable' };
		$('#version_btn')
			.html(capitalized[versionState] +
				' <span class="caret"></span>');

		$('#version_selection a').click(function() {
			versionState = this.dataset.version;
			$('#version_btn')
				.html(capitalized[versionState] +
					' <span class="caret"></span>');
			loadPreview();
		});

		$('#save_button').click(editor.save.bind(editor));
		$('#reset_button').click(editor.reset.bind(editor));
		$('#undo_button').click(editor.undo.bind(editor));
		$('#redo_button').click(editor.redo.bind(editor));

		if (editor.getValue()) loadPreview();

		$('[data-toggle="tooltip"]').tooltip({ html: true });
	});
});
