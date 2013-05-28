/*
  * jQuery Canvas Spinner Plugin
  * version: 1.1
  * Author: Ollie Relph
  * http://github.com/BBB/jquery-canvasspinner
  * Copyright: Copyright 2010 Ollie Relph
  */ 
  
define([
	'jquery'
], function(c) {

c.fn.spinner=function(a){a=c.extend({sqr:undefined,framerate:10,spokeCount:16,rotation:0,spokeOffset:{inner:undefined,outer:undefined},spokeWidth:undefined,colour:"255,255,255",backup:"images/spinner.gif",centered:true},a||{});return this.each(function(){function i(){b.clearRect(d*-1,d*-1,a.sqr,a.sqr);b.rotate(Math.PI*2/a.spokeCount+a.rotation);for(var h=0;h<a.spokeCount;h++){b.rotate(Math.PI*2/a.spokeCount);b.strokeStyle="rgba("+a.colour+","+h/a.spokeCount+")";b.beginPath();b.moveTo(0,
a.spokeOffset.inner);b.lineTo(0,a.spokeOffset.outer);b.stroke()}}var g=c(this),e=g.width(),f=g.height(),b,d;a.sqr=Math.round(e>=f?f:e);d=a.sqr/2;a.rotation=a.rotation/180*Math.PI;a.spokeOffset.inner=a.spokeOffset.inner||d*0.3;a.spokeOffset.outer=a.spokeOffset.outer||d*0.6;e=c('<div id="spinner-'+c.fn.spinner.count+'" class="spinner" />');a.centered&&e.css({position:"absolute","z-index":999,left:"50%",top:"50%",margin:d*-1+"px 0 0 "+d*-1+"px",width:a.sqr,height:a.sqr});f=c("<canvas />").attr({width:a.sqr,
height:a.sqr});g.css("position")==="static"&&a.centered&&g.css({position:"relative"});f.appendTo(e);e.appendTo(g);if(f[0].getContext){b=f[0].getContext("2d");b.translate(d,d);b.lineWidth=a.spokeWidth||Math.ceil(a.sqr*0.025);b.lineCap="round";this.loop=setInterval(i,1E3/a.framerate)}else{f.remove();e.css({"background-image":"url("+a.backup+")","background-position":"center center","background-repeat":"none"})}c.fn.spinner.count++})};c.fn.spinner.count=0;c.fn.clearSpinner=function(){return this.each(function(){clearTimeout(c.fn.spinner.loop);
c(this).find("div.spinner").fadeOut().remove().end()})};	

});

