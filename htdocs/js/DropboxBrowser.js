define([
	'jquery'
], function($) {
	function DropboxBrowser(container, o) {
		var _this = this, newFileInput;
		this.container = container;
		this.event = $({});
		this.editor = o.editor;
		
		this.container.append(
			this.folderList = $('<ul class="folder_list" />'),
			this.fileList = $('<ul class="file_list" />'),
			$('<button />').addClass('new_file_button').text('New File').click(function(e) {
				_this.fileList.append(
					$('<li />').addClass('ly').append(
						newFileInput = $('<input />').attr('type', 'text').val('Untitled.ly').blur(function() {
							$(this).css({backgroundColor: 'transparent', border: 'none', marginLeft: '5px'});
							_this.newFile((_this.currentPath == '/' ? '' : _this.currentPath) + '/' + $(this).val());
						}).keyup(function(e) {
							if (e.which == 13) $(this).blur();
						})
					)
				);
				
				newFileInput.focus();
				window.input = newFileInput;
			})
		);
		this.openFolder('/');
	}
	DropboxBrowser.prototype.openFolder = function(path) {
		var _this = this;
		this.currentPath = path;
		
		this.folderList.css({opacity: .3});
		this.fileList.css({opacity: .3});
		$.getJSON('/dropbox_metadata?path=' + encodeURIComponent(path), function(response) {
			_this.contents = response.contents;
			_this.render();
			_this.folderList.css({opacity: 1});
			_this.fileList.css({opacity: 1});
		});
	};
	DropboxBrowser.prototype.openFile = function(path, contents, loadPreview) {
		this.editor.openFile(path, contents, loadPreview);
	};
	DropboxBrowser.prototype.newFile = function(path) {
		var _this = this;
	
		this.folderList.css({opacity: .3});
		this.fileList.css({opacity: .3});

		$.post('/dropbox_save', {
			path: path,
			contents: ''
		}, function(response, status) {
			_this.openFolder(_this.currentPath);			
		});
	};
	DropboxBrowser.prototype.render = function() {
		var _this = this;
		
		this.folderList.empty();
		this.fileList.empty();

		if (this.currentPath && this.currentPath != '/') {
			var _path = this.currentPath.split('/');
			_path.splice(-1);
			_path = _path.join('/');
			
			this.folderList.append(
				$('<li />').addClass('level_up').append(
					$('<button />').text('Up a Level').click(function() {
						_this.openFolder(_path);
					})
				)
			);
		}

		_(this.contents).each(function(fileOrFolder) {
			if (fileOrFolder.is_dir) {
				_this.folderList.append(
					$('<li />').append(
						$('<button />').text(fileOrFolder.path.split('/').slice(-1)[0]).click(function() {
							_this.openFolder(fileOrFolder.path);
						})
					)
				);
			} else {
				_this.fileList.append(
					$('<li />').append(
						$('<button />').text(fileOrFolder.path.split('/').slice(-1)[0]).click(function() {
							_this.editor.spinner.show();
							$.get('/dropbox_file?path=' + encodeURIComponent(fileOrFolder.path), function(contents, status) {
								_this.editor.spinner.hide();
								_this.openFile(fileOrFolder.path, contents, fileOrFolder.path.substr(-3) == '.ly');
							});
						})
					).addClass(fileOrFolder.path.substr(-3) == '.ly' ? 'ly' : '')
				);
			}
		});
	};
	
	return DropboxBrowser;
});
