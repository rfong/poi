var settings = {
  REFRESH: 50,  // refresh rate in ms
  STEPS: 60,    // # of intervals to divide wave into

  CIRCLE_R: 60,
  CIRCLE_X: 80,
  CIRCLE_Y: 100,

  canvas: {
    width: 0,
    height: 0,
  },
};


// Hooray, pseudo-OOP JS


/* Canvas graphics primitives */

var CanvasRenderer = function(ctx) {
  this.ctx = ctx;
};
_.extend(CanvasRenderer.prototype, {

  reset: function() {
    console.log(this);
    this.ctx.clearRect(0, 0, settings.canvas.width, settings.canvas.height);
  },

  draw_circ: function(x, y, r) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2, true);
    this.ctx.stroke();
    this.ctx.closePath();
  },

  draw_dot: function(x, y, r) {
    r = r || 3.5;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2, true);
    this.ctx.fill();
    this.ctx.closePath();
  },

  draw_line: function(x0, y0, x1, y1) {
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();
    this.ctx.closePath();
  },

});


/* Plotter with relative origin */

var Plotter = function(ctx, x, y) {
  this.set_origin(x, y);
  console.log(this.__proto__.constructor);
  this.__proto__.constructor.apply(this, [ctx]);
};
Plotter.prototype = Object.create(CanvasRenderer.prototype);
_.extend(Plotter.prototype, {

  draw: function(step, r) {
    this.reset();

    var angle = this.step_to_radians(step);
    this.draw_polar_point(angle, r);
  },

  set_origin: function(x, y) {
    this.origin = {x: x, y: y};
  },

  step_to_radians: function(step) {
    return 2 * Math.PI * step / settings.STEPS;
  },

  /* Convenience drawing methods */

  draw_polar_point: function(radians, radius) {
    this.draw_point(radius * Math.cos(radians), radius * Math.sin(radians));
  },

  draw_point: function(x, y) {
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1.5;
    this.draw_line_to_origin(x, y);
    
    this.ctx.fillStyle = 'Orange';
    this.draw_dot(x, y, 3.5);    
  },

  draw_line_to_origin: function(x, y) {
    this.draw_line(0, 0, x, y);
  },

  /* Overridden primitives */

  draw_circ: function(x, y, r) {
    this.initialize.__super__.draw_circ.apply(this, [
      x + this.origin.x, y + this.origin.y, r,
    ]);
  },

  draw_dot: function(x, y, r) {
    this.initialize.__super__.draw_dot.apply(this, [
      x + this.origin.x, y + this.origin.y, r,
    ]);
  },

  draw_line: function(x0, y0, x1, y1) {
    this.initialize.__super__.draw_line.apply(this, [
      x0 + this.origin.x, y0 + this.origin.y,
      x1 + this.origin.x, y1 + this.origin.y,
    ]);
  },
  
});


/* Polar plotter whose origin moves according to a periodic function.
 *  Normalized to unit period.
 */

var TravelingPlotter = function(ctx, x, y, traveling_function) {
  this.traveling_function = traveling_function;
  Plotter.prototype.initialize.apply(this, [ctx, x, y]);
};
TravelingPlotter.prototype = Object.create(Plotter.prototype);
_.extend(TravelingPlotter.prototype, {

  draw: function(step, r) {
    this.initialize.__super__.draw.apply(this, arguments);
  },

});


// main
$(function() {
  var canvas = $('#canvas').get(0);
  var ctx = canvas.getContext("2d");
  var step = 0;
  var renderer = new Plotter(ctx, settings.CIRCLE_X, settings.CIRCLE_Y);

  settings.canvas.width = canvas.width;
  settings.canvas.height = canvas.height;

  // main loop
  setInterval(function() {
    renderer.draw(step, 50);
    advanceTime();
  }, settings.REFRESH);

  function advanceTime() {
    step++;
    if (step > settings.STEPS) { step = 0; }
  };
});


function SuperSuperClass() {};
_.extend(SuperSuperClass.prototype, {
  foo: function() {
    console.log("supersuperclass");
  },
});

function SuperClass() {};
SuperClass.prototype = Object.create(SuperSuperClass.prototype);
_.extend(SuperClass.prototype, {
  foo: function() {
    console.log("superclass");
    SuperClass.prototype.__proto__.foo.apply(this, arguments);
  },
});

function Class() {};
Class.prototype = Object.create(SuperClass.prototype);
_.extend(Class.prototype, {
  foo: function() {
    console.log("class");
    Class.prototype.__proto__.foo.apply(this, arguments);
  },
});

(new Class()).foo();
