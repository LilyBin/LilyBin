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
		bootstrap: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min',
		CodeMirror: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.3.0/',
		// CDNJS uses weird paths. Need this hack to allow loading CM addons
		// which references a nonexistant "../../lib/codemirror".
		'CodeMirror/lib/codemirror': 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.3.0/codemirror.min'
	}
});

require([
	'jquery',
	'Preview',
	'Editor',
	'bootstrap'
], function($, Preview, Editor) {
	$(function() {
		var score = {};
		var currentPage = window.location.pathname.slice(1);
		score.id = currentPage.split('/')[0] || '';

		var capitalized = { unstable: 'Unstable', stable: 'Stable' };
		$('#version_selection a').click(function() {
			var state = this.dataset.version;
			$('#version_btn')
				.data('state', state)
				.html(capitalized[state] +
					' <span class="caret"></span>');
			loadPreview();
		});

		$.get('https://s3-us-west-2.amazonaws.com/lilybin-tarballs/versions.json', function(data) {
			$('#version_selection a[data-version="stable"]')  .append(' (' + data.stable   + ')');
			$('#version_selection a[data-version="unstable"]').append(' (' + data.unstable + ')');
		});

		function loadPreview() {
			preview.load({
				code: editor.getValue(),
				version: $('#version_btn').data('state')
			});
		}

		function save() {
			$.post('/save', {
				id: score.id,
				code: editor.getValue(),
				version: $('#version_btn').data('state')
			}, function(response) {
				window.location = '/' + response.id + '/' + response.revision;
			}, 'json');
		}

		var editor = new Editor($('#code_container'));
		editor.event.bind({ 'editor:preview': loadPreview,
		                    'editor:save'   : save });

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

		$.get('/api/' + currentPage).done(function(data) {
			score.version = data.version;
			$('#version_btn').data('state', data.version);
			$('#version_btn')
				.html(capitalized[data.version] +
					' <span class="caret"></span>');

			score.code    = data.code;
			editor.openFile(data.code, !!data.code);
		}).fail(function(err) {
			var errorMessage;
			if (err.responseJSON && err.responseJSON.err) {
				errorMessage = err.responseJSON.err;
			} else {
				errorMessage = err.statusText;
			}
			preview.handleResponse({error: errorMessage});
			$('#preview_button')     .off('click');
			$('#save_button')        .off('click');
			$('#version_selection a').off('click');
		})

		// Tooltips are weird-behaving on touch screen devices.
		// Simply disable them.
		if (window.innerWidth >= 992 ||
			!('ontouchstart' in window) &&
			(!window.DocumentTouch || !(document instanceof DocumentTouch))) {
			$('[data-toggle="tooltip"]').tooltip({ html: true, placement: 'bottom' });
		}
	});
});
