define([
	'jquery',
	'plugins/mousewheel',
	'plugins/spinner'
], function($) {
	function Preview(container, id) {
		var _this = this;
	
		this.id = id;
		this.page = 1;
		this.container = container;
		this.img = container.find('img');
		this.prevButton = $('<button></button>')
			.text('Previous Page')
			.click(function() {
				_this.prevPage();
			});
		this.nextButton = $('<button></button>')
			.text('Next Page')
			.click(function() {
				_this.nextPage();
			});
		this.zoomInButton = $('<button></button>').text('Zoom In').click(function() {
			_this.zoomIn();
		});
		this.zoomOutButton = $('<button></button>').text('Zoom Out').click(function() {
			_this.zoomOut();
		});
		this.fitButton = $('<button></button>').text('Fit').click(function() {
			_this.fit();
		});
		this.fitWidthButton = $('<button></button>').text('Fit Width').click(function() {
			_this.fit(true);
		});
		this.downloadPDFButton = $('<button></button>').text('Download PDF').click(function() {
			//window.location = '/downloadPDF?id=' + _this.id;
			$('<iframe />').css('display', 'none').appendTo('body').attr('src', '/downloadPDF?id=' + _this.id);
		});
		this.downloadMidiButton = $('<button></button>').text('Download Midi').click(function() {
			$('<iframe />').css('display', 'none').appendTo('body').attr('src', '/downloadMidi?id=' + _this.id);
		});
	
		this.spinner = $('<div />').css({position: 'absolute', width: '100%', height: '100%'}).spinner({ colour: '100,100,100' }).hide();
	
		var controls = $('<div class="preview_controls"></div>').append(
			this.prevButton,
			this.nextButton,
			this.zoomInButton,
			this.zoomOutButton,
			this.fitButton,
			this.fitWidthButton,
			this.downloadPDFButton,
			this.downloadMidiButton
		);

		this.error = $('<div />').addClass('preview_error').append($('<h3 />').text('Error'), $('<pre />').addClass('message'));
	
		this.setupPanning();
	
		container.append(controls, this.spinner, this.error);
	}
	Preview.prototype.prevPage = function() {
		--this.page;
		if (this.page == 1) this.prevButton.attr('disabled', 'disabled');
		this.nextButton.removeAttr('disabled');
		this.setImgSrc();
	};
	Preview.prototype.nextPage = function() {
		++this.page;
		this.setImgSrc();
		if (this.page == this.pages) this.nextButton.attr('disabled', 'disabled');
		this.prevButton.removeAttr('disabled');
	};
	Preview.prototype.setImgSrc = function() {
		this.img.attr('src', '/preview?id=' + this.id + '&page=' + this.page + this.cacheBuster);
	};
	Preview.prototype.load = function(score) {
		var _this = this;
		this.spinner.show();
		this.error.hide();
		this.img.css({opacity: 0.3});
		score.id = this.id;
		$.post('/prepare_preview', score, function(response) {
			_this.handleResponse(response);
			_this.spinner.hide();
			_this.img.css({opacity: 1});
		}, 'json');
	};
	Preview.prototype.handleResponse = function(data) {
		var _this = this;
		if (data.error) {
			this.error.show().find('.message').text(data.error);
			return false;
		}
		this.cacheBuster = '&t=' + new Date().getTime();
		this.id = data.id;
		this.pages = data.pages;
		if (this.page > this.pages) this.page = 1;
		this.prevButton.removeAttr('disabled'); this.nextButton.removeAttr('disabled');
		if (this.page == 1) this.prevButton.attr('disabled', 'disabled');
		if (this.page == this.pages) this.nextButton.attr('disabled', 'disabled');
		this.setImgSrc();
		this.readImgRatio(function(ratioChanged) {
			if (ratioChanged) _this.fit();
		});
	}
	Preview.prototype.readImgRatio = function(cb) {
		var _this = this;
		$("<img></img>")
		.attr("src", this.img.attr("src"))
		.load(function() {
			var oldRatio = _this.imgRatio;
			_this.imgRatio = this.width / this.height;
			_this.imgSize = {width: this.width, height: this.height};
			if (cb) cb(oldRatio != _this.imgRatio);
		});
	};
	Preview.prototype.setupPanning = function() {
		var _this = this;
		this.img.mousedown(function(e) {
			var x = _this.img.position().left, y = _this.img.position().top,
				_pageX = e.pageX, _pageY = e.pageY;
		
			$(document).mousemove(move);
	
			function move(e) {
				_this.img.css({
					left: x + (e.pageX - _pageX) + 'px',
					top: y + (e.pageY - _pageY) + 'px'
				});
				e.preventDefault();
				return false;
			}
		
			$(document).mouseup(function(e) {
				$(document).unbind('mousemove', move);
			});
		
			e.preventDefault();
			return false;
		});
	
		this.container.mousewheel(function(e, delta, deltaX, deltaY) {
			_this.img.css({
				top: _this.img.position().top + deltaY * 20,
				left: _this.img.position().left - deltaX * 20
			});
		
			e.preventDefault();
			return false;
			//if (deltaY > 0) _this.zoomIn();
			//if (deltaY < 0) _this.zoomOut();
		});
	};
	Preview.prototype.fit = function(fitWidth) {
		var controlsHeight = this.container.find('.preview_controls').outerHeight();
			containerHeight = this.container.height() - controlsHeight,
			containerWidth = this.container.width(),
			containerRatio = containerWidth / containerHeight,
			margin = 10;
		
		this.img.css({top: controlsHeight + margin + 'px', left: margin + 'px'});
		
		if (containerRatio < this.imgRatio || fitWidth) {
			// fit width
			this.img.css({
				width: containerWidth - margin * 2,
				height: containerWidth / this.imgRatio - margin * 2
			});
		} else {
			// fit height
			this.img.css({
				height: containerHeight - margin * 2,
				width: containerHeight * this.imgRatio,
				left: (containerWidth - containerHeight * this.imgRatio) / 2
			});
		}
	};
	Preview.prototype.zoomIn = function() {
		var width = this.img.width(),
			height = this.img.height(),
			widthDiff = (height + height * .1) * this.imgRatio - width;
	
		this.img.css({
			width: (height + height * .1) * this.imgRatio,
			height: height + height * .1,
			top: this.img.position().top - (height * .05),
			left: this.img.position().left - widthDiff * .5
		});
	};
	Preview.prototype.zoomOut = function() {
		var width = this.img.width(),
			height = this.img.height(),
			widthDiff = width - (height - height * .1) * this.imgRatio;
		
		this.img.css({
			width: (height - height * .1) * this.imgRatio,
			height: height - height * .1,
			top: this.img.position().top + (height * .05),
			left: this.img.position().left + widthDiff * .5
		});
	};
	return Preview;
});
