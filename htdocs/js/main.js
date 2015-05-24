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
		var codeContainer = $('#code_container, .CodeMirror, .CodeMirror-gutters')
			.css({height: (xs ? mainHeight * (5/12) : mainHeight) + 'px'});
		var previewContainer = $('#preview_container')
			.css({height: (xs ? mainHeight * (7/12) : mainHeight) + 'px'});

		var timer;
		$(window).resize(function() {
			if (timer) clearTimeout(timer);

			timer = setTimeout(function() {
				var mainHeight = $(window).height() - $('#header').outerHeight();
				var mainWidth  = $(window).width();
				// Corresponds with Bootstrap's xs
				var xs = mainWidth < 768;

				codeContainer
					.css({height: (xs ? mainHeight * (5/12) : mainHeight) + 'px'});
				previewContainer
					.css({height: (xs ? mainHeight * (7/12) : mainHeight) + 'px'});

				preview.fit();
			}, 200);
		});

		var preview = new Preview($('#preview_container'), score.id);

		$('#preview_button').click(loadPreview);

		$('#save_button').click(editor.save.bind(editor));
		$('#reset_button').click(editor.reset.bind(editor));
		$('#undo_button').click(editor.undo.bind(editor));
		$('#redo_button').click(editor.redo.bind(editor));

		if (editor.getValue()) loadPreview();

		// Tooltips are weird-behaving on touch screen devices.
		// Simply disable them.
		if (!('ontouchstart' in window) &&
			(!window.DocumentTouch || !(document instanceof DocumentTouch))) {
			$('[data-toggle="tooltip"]').tooltip({ html: true, placement: 'bottom' });
		}
	});
});
