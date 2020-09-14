jQuery(document).ready(function($){
	
	
if (typeof rainofline_mainId === 'undefined' || rainofline_mainId === null) {
    rainofline_mainId = mainId;
}	
	
	var RENDERER = {
	MAX_LINE_COUNT : 1000,
	DELTA_LINE_COUNT : 1,
	DELTA_THETA : Math.PI / 500,
	
	init : function(){
		this.setParameters();
		this.reconstructMethods();
		this.createLines();
		this.render();
	},
	setParameters : function(){
		var $container = $('#'+rainofline_mainId);
		this.width = $container.width();
		this.height = $container.height();
		this.context = $('<canvas />').attr({width : this.width, height : this.height}).appendTo($container).get(0).getContext('2d');
		this.lines = [];
		this.theta = 0;
		this.thresholdX1 = this.width * 3 / 5;
		this.thresholdX2 = this.width / 8;
		this.thresholdY1 = this.height / 6;
		this.thresholdY2 = -this.height / 8;
		this.aspectRatio = (this.thresholdY1 - this.thresholdY2) / (this.thresholdX1 - this.thresholdX2);
	},
	reconstructMethods : function(){
		this.render = this.render.bind(this);
	},
	createLines : function(){
		if(this.lines.length >= this.MAX_LINE_COUNT){
			return;
		}
		for(var i = 0, length = this.DELTA_LINE_COUNT; i < length; i++){
			this.lines.push(new LINE(this));
		}
	},
	getPosition : function(x){
		return {
			relation : (x >= -this.thresholdX2 && x <= this.thresholdX2) ? 0 : 1,
			floor : this.thresholdY1 + (this.thresholdY2 - this.thresholdY1) * (this.thresholdX1 - Math.abs(x)) / (this.thresholdX1 - this.thresholdX2)
		};
	},
	render : function(){
		requestAnimationFrame(this.render);
		this.context.clearRect(0, 0, this.width, this.height);
		var hue = 200 + 30 * Math.sin(this.theta);
		
		for(var i = 0, length = this.lines.length; i < length; i++){
			this.lines[i].render(hue);
		}
		this.createLines();
		this.theta += this.DELTA_THETA;
		this.theta %= Math.PI * 2;
	}
};
var LINE = function(renderer){
	this.renderer = renderer;
	this.init();
};
LINE.prototype = {
	FOCUS_POSITION : 600,
	NEAR_LIMIT : -400,
	FAR_LIMIT : 600,
	LENGTH : 10,
	RADIUS : 5,
	INIT_COUNT : 120,
	GRAVITY : -0.05,
	RESISTANCE : 0.05,
	MAX_EXTEND_COUNT : 30,
	MAX_RIPPLE_COUNT : 50,
	VZ : -3,
	
	init : function(){
		this.x = this.getRandomValue(-this.renderer.width * 3 / 5, this.renderer.width * 3 / 5);
		this.y = this.renderer.height * 3 / 4;
		this.z = this.getRandomValue(this.NEAR_LIMIT, this.FAR_LIMIT);
		this.vy = 0;
		var position = this.renderer.getPosition(this.x);
		this.floor = position.floor;
		this.relation = position.relation;
		this.status = 0;
		this.extendCount = 0;
		this.rippleCount = 0;
	},
	getRandomValue : function(min, max){
		return min + (max - min) * Math.random();
	},
	controlStatus : function(context, hue){
		var rate = this.FOCUS_POSITION / (this.z + this.FOCUS_POSITION),
			axis = {
				x1 : this.renderer.width / 2 + this.x * rate,
				y1 : this.renderer.height / 2 - this.y * rate,
				rate : rate,
				ratio : (this.FAR_LIMIT - this.z) / (this.FAR_LIMIT + this.FOCUS_POSITION),
				ripple : false
			};
		switch(this.relation){
		case 0:
			switch(this.status){
			case 0:
				this.y += this.vy;
				this.vy += this.GRAVITY;
				axis.x2 = axis.x1;
				axis.y2 = this.renderer.height / 2 - Math.max(this.renderer.thresholdY2, this.y - this.LENGTH) * rate;
				
				if(this.y < this.renderer.thresholdY2){
					this.y = this.renderer.thresholdY2;
					this.rippleCount = 0;
					this.status = 1;
				}
				break;
			case 1:
				if(this.rippleCount++ == this.MAX_RIPPLE_COUNT || this.z < -this.FOCUS_POSITION){
					this.init();
				}else{
					this.z += this.VZ;
					axis.ripple = true;
				}
			}
			break;
		case 1:
			switch(this.status){
			case 0:
				this.y += this.vy;
				this.vy += this.GRAVITY;
				axis.x2 = axis.x1;
				axis.y2 = this.renderer.height / 2 - Math.max(this.floor, this.y - this.LENGTH) * rate;
				
				if(this.y < this.floor){
					this.y = this.floor;
					this.vy = 0;
					this.extendCount = this.MAX_EXTEND_COUNT;
					this.status = 1;
				}
				break;
			case 1:
				if(this.extendCount-- == 0){
					this.status = 2;
					this.vy = 0;
				}
			case 2:
				this.x += this.vy / this.renderer.aspectRatio * ((this.x < 0) ? -1 : 1);
				this.y += this.vy;
				this.vy += this.GRAVITY * this.RESISTANCE;
				
				var extendRate = (this.MAX_EXTEND_COUNT - this.extendCount) / this.MAX_EXTEND_COUNT,
					offsetY = -this.LENGTH / 2 * extendRate,
					offsetX = -offsetY / this.renderer.aspectRatio * ((this.x < 0) ? 1 : -1);
					
				if(this.x + offsetX < 0 && this.x + offsetX > -this.renderer.thresholdX2 || this.x + offsetX > 0 && this.x + offsetX < this.renderer.thresholdX2){
					axis.shadow = this.renderer.width / 2 + (this.x + offsetX) * rate;
					offsetY *= (this.renderer.thresholdX2 * ((this.x + offsetX < 0) ? -1 : 1) - this.x) / offsetX;
					offsetX = this.renderer.thresholdX2 * ((this.x + offsetX < 0) ? -1 : 1) - this.x;
				}
				axis.x2 = this.renderer.width / 2 + (this.x + offsetX) * rate;
				axis.y2 = this.renderer.height / 2 - (this.y + offsetY) * rate;
				
				if(axis.shadow){
					axis.shadow = (axis.x1 - axis.x2) / (axis.x1 - axis.shadow);
				}
				if(this.x >= -this.renderer.thresholdX2 && this.x <= this.renderer.thresholdX2){
					this.init();
				}
			}
		}
		return axis;
	},
	render : function(hue){
		var context = this.renderer.context,
			axis = this.controlStatus(context, hue),
			ratio = 20 + 60 * axis.ratio;
		context.lineWidth = 0.5 + 1 * axis.ratio;
		context.strokeStyle = 'hsl(' + hue + ', ' + ratio + '%, ' + ratio + '%)';
		context.beginPath();
		context.moveTo(axis.x1, axis.y1);
		context.lineTo(axis.x2, axis.y2);
		context.stroke();
		
		if(axis.ripple){
			var rate = this.rippleCount / this.MAX_RIPPLE_COUNT;
			context.save();
			context.translate(axis.x1, axis.y1);
			context.scale(rate, rate * 0.5);
			context.lineWidth = 1 + 3 * axis.ratio;
			context.strokeStyle = 'hsla(' + hue + ', ' + ratio + '%, ' + ratio + '%, ' + (1 - rate * rate) + ')';
			context.beginPath();
			context.arc(0, 0, this.RADIUS * axis.rate, 0, Math.PI * 2, false);
			context.stroke();
			context.restore();
		}else if(axis.shadow){
			context.strokeStyle = 'hsla(' + hue + ', ' + (ratio + 20) + '%, ' + ratio + '%, ' + axis.shadow + ')';
			context.beginPath();
			context.moveTo(axis.x2, axis.y2);
			context.lineTo(axis.x2, axis.y2 + this.LENGTH * axis.rate * (1 - axis.shadow));
			context.stroke();
		}
	}
};
$(function(){
	RENDERER.init();
});
})