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

  origin: {
    color: '#ffa500',
    size: 3.5,
  },

  point: {
    color: '#f00',
    size: 6,
  },
};


// Hooray, pseudo-OOP JS


/* Canvas graphics primitives */

var CanvasRenderer = function(ctx) {
  this.ctx = ctx;
};
_.extend(CanvasRenderer.prototype, {

  reset: function() {
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


function step_to_radians(step) {
  return 2 * Math.PI * step / settings.STEPS;
};


/* Plotter with relative origin */

var Plotter = function(ctx, x, y) {
  this.set_origin(x, y);
  Plotter.prototype.__proto__.constructor.apply(this, [ctx]);
  console.log(this.origin);
};
Plotter.prototype = Object.create(CanvasRenderer.prototype);
_.extend(Plotter.prototype, {
  constructor: Plotter,

  draw: function(step, r) {
    this.draw_polar_point(step_to_radians(step), r);
  },

  refresh: function(step, r) {
    this.reset();
    this.draw(step, r);
  },

  set_origin: function(x, y) {
    this.origin = {x: x, y: y};
  },

  /* Convenience drawing methods */

  draw_polar_point: function(radians, radius) {
    this.draw_point(radius * Math.cos(radians), radius * Math.sin(radians));
  },

  draw_point: function(x, y) {
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1.5;
    this.draw_line_to_origin(x, y);
    
    this.ctx.fillStyle = settings.point.color;
    this.draw_dot(x, y, settings.point.size);
  },

  draw_line_to_origin: function(x, y) {
    this.draw_line(0, 0, x, y);
  },

  /* Overridden primitives */

  draw_circ: function(x, y, r) {
    Plotter.prototype.__proto__.draw_circ.apply(this, [
      x + this.origin.x, y + this.origin.y, r,
    ]);
  },

  draw_dot: function(x, y, r) {
    Plotter.prototype.__proto__.draw_dot.apply(this, [
      x + this.origin.x, y + this.origin.y, r,
    ]);
  },

  draw_line: function(x0, y0, x1, y1) {
    Plotter.prototype.__proto__.draw_line.apply(this, [
      x0 + this.origin.x, y0 + this.origin.y,
      x1 + this.origin.x, y1 + this.origin.y,
    ]);
  },
  
});


/* Polar plotter whose origin travels according to a periodic function.
 *  Traveling function returns an array [x, y] which offsets from
 *  initial origin.
 */

var TravelingPlotter = function(ctx, x, y, traveling_functions) {
  this.traveling_functions = traveling_functions;
  this.initial_origin = {x: x, y: y};
  TravelingPlotter.prototype.__proto__.constructor.apply(this, [ctx, x, y]);
};
TravelingPlotter.prototype = Object.create(Plotter.prototype);
_.extend(TravelingPlotter.prototype, {
  constructor: TravelingPlotter,

  draw: function(step, r) {
    this.reset();

    var self = this,
        args = arguments;
    _.each(this.traveling_functions, function(fn) {
      self.set_traveling_origin(fn, step, r);
      self.constructor.prototype.__proto__.draw.apply(self, args);
    });

    // draw the origins last since they're smaller and we want them to be on top?
    _.each(this.traveling_functions, function(fn) {
      self.set_traveling_origin(fn, step, r);
      self.draw_origin();
    });
  },

  draw_origin: function() {
    this.ctx.fillStyle = settings.origin.color;
    this.draw_dot(0, 0, settings.origin.size);
  },

  set_traveling_origin: function(traveling_function, step, r) {
    var travel = traveling_function(step, r),
        origin = [this.initial_origin.x + travel[0],
                  this.initial_origin.y + travel[1]];
    this.set_origin.apply(this, origin);
  },

});


/* Traveling pattern function signature:
 * :param step: step time out of settings.STEPS
 * :param d: poi length (handle center to head center)
 * :returns: [x, y]
 */
var patterns = {

  // simple back and forth oscillation
  test: function(step, d) {
    return [step < settings.STEPS / 2 ? step : settings.STEPS - step, 0];
  },

  // Circle of radius d/2
  extension: function(step, d) {
    var radians = step_to_radians(step);
    return [d/2 * Math.cos(radians), d/2 * Math.sin(radians)];
  },

  // Circle of radius d/2, phase shifted by π
  isolation: function(step, d) {
    var radians = Math.PI + step_to_radians(step);
    return [d/2 * Math.cos(radians), d/2 * Math.sin(radians)];
  },

};


// Parametric generators that return patterns fitting the format above.
var pattern_generators = {

  /* :param n: number of sides
   * :param rotation: angle to phase shift, in radians
   */
  polygon: function(n, rotation) {
    return function(step, d) {
      var angle = step_to_radians(step),
          r = d/2 * (Math.cos(Math.PI/n) / Math.cos(n * angle) % (1/n - Math.PI/n));
      return [r * Math.cos(angle), r * Math.sin(angle)];
    };
  },

/*n=5;
theta=(0:999)/1000;
r=cos(pi/n)/cos(2*pi*(n*theta)%%1/n-pi/n);
plot(r*cos(2*pi*theta),r*sin(2*pi*theta),asp=1,xlab="X",ylab="Y",
main=paste("Regular ",n,"-gon",sep=""));
*/

};


// main
$(function() {
  var canvas = $('#canvas').get(0);
  var ctx = canvas.getContext("2d");
  var step = 0;
  var renderer = new TravelingPlotter(
    ctx, settings.CIRCLE_X, settings.CIRCLE_Y, [patterns.isolation, patterns.extension]
  );

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
