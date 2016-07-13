var settings = {
  REFRESH: 25,   // refresh rate in ms
  STEPS: 180,    // # of intervals to divide wave into

  canvas: {
    width: 0,
    height: 0,
  },

  origin: {
    color: '#ffa500',
    size: 5,
  },

  point: {
    color: '#f00',
    size: 10,
  },
};


/* math convenience functions */

function step_to_radians(step) {
  return 2 * Math.PI * step / settings.STEPS;
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
 *  Traveling function returns a 2D Vector which offsets from
 *  initial origin.
 */

var TravelingPlotter = function(ctx, x, y, patterns) {
  this.patterns = patterns;
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
    _.each(this.patterns, function(pattern) {
      self.set_traveling_origin(pattern.traveling_function, step, r);

      self.trace_origin(pattern, r);
      self.trace_pattern(pattern, r);

      // Draw
      self.constructor.prototype.__proto__.draw.apply(self, [
        step * pattern.frequency, r
      ]);

      // todo: maybe make sure origins are drawn on top since they're smaller?
      self.draw_origin();
    });
  },

  draw_origin: function() {
    this.ctx.fillStyle = settings.origin.color;
    this.draw_dot(0, 0, settings.origin.size);
  },

  trace_pattern: function(pattern, r) {
    // Persistent trace of a pattern
    this.ctx.strokeStyle = '#faa';
    var circle_fn = pattern_generators.circle(pattern.frequency);
    this.trace_function(
      function(step, r) {
        return pattern.traveling_function(step, r).add(circle_fn(step, r));
      }, r);
  },

  trace_origin: function(pattern, r) {
    // Persistent trace of the origin's movement
    this.ctx.strokeStyle = '#c2a7dd';
    this.trace_function(pattern.traveling_function, r);
  },

  trace_function: function(fn, r) {
    // Persistent trace of a function(step, r)
    this.ctx.beginPath();
    this.ctx.lineWidth = 1.5;
    
    // simulate a full period
    // one extra point for smoothness
    for (var step = 0; step <= settings.STEPS; step++) {
      var coords = fn(step, r);
      if (step==0) {
        this.ctx.moveTo(this.initial_origin.x + coords.x,
                        this.initial_origin.y + coords.y);
      } else {
        this.ctx.lineTo(this.initial_origin.x + coords.x,
                        this.initial_origin.y + coords.y);
      }
    }
    this.ctx.stroke();
    this.ctx.closePath();
  },

  set_traveling_origin: function(traveling_function, step, r) {
    var travel = traveling_function(step, r),
        origin = [this.initial_origin.x + travel.x,
                  this.initial_origin.y + travel.y];
    this.set_origin.apply(this, origin);
  },

});


/* Traveling function signature:
 * :param step: step time out of settings.STEPS
 * :param d: poi length (handle center to head center)
 * :returns: 2D Vector
 */
var traveling_functions = {

  // simple back and forth oscillation
  test: function(step, d) {
    return new Vector(step < settings.STEPS / 2 ? step : settings.STEPS - step, 0);
  },

  // Circle of radius d/2
  extension: function(step, d) {
    var radians = step_to_radians(step);
    return new Vector(d/2 * Math.cos(radians), d/2 * Math.sin(radians));
  },

  // Circle of radius d/2, phase shifted by π
  isolation: function(step, d) {
    var radians = Math.PI + step_to_radians(step);
    return new Vector(d/2 * Math.cos(radians), d/2 * Math.sin(radians));
  },

};

// Parametric generators that return functions fitting the format above.
var pattern_generators = {

  /* :param n: number of sides
   * :param rotation: angle to phase shift, in radians, from pointing up
   */
  polygon: function(n, rotation) {
    rotation = rotation || 0;  // TODO: actually use this

    return function(step, d) {
      var angle = step_to_radians(step),
          // polar equation for edge: cos(π/n) / cos((theta mod 2π/n) - π/n)
          r = (d * (
            Math.cos(Math.PI/n) / Math.cos(angle % (2*Math.PI/n) - Math.PI/n)
          ));
      return new Vector(r * Math.cos(angle), r * Math.sin(angle));
    };
  },

  
  circle: function(frequency) {
    return function(step, r) {
      var angle = step_to_radians(step * frequency);
      return new Vector(r * Math.cos(angle), r * Math.sin(angle));
    };
  },

};


// Complete pattern specifications
var patterns = {

  test: {
    frequency: -2,
    traveling_function: traveling_functions.isolation,
  },

  triquetra: {
    frequency: -3,
    traveling_function: pattern_generators.polygon(3),
  },

};


// main
$(function() {
  var canvas = $('#canvas').get(0);
  var ctx = canvas.getContext("2d");
  var step = 0;
  var origin = new Vector(300, 300);
  var r = 150;

  var renderer = new TravelingPlotter(
    ctx, origin.x, origin.y, [
      patterns.test,
      //patterns.isolation, pattern_generators.polygon(3)
    ]
  );

  settings.canvas.width = canvas.width;
  settings.canvas.height = canvas.height;

  // main loop
  setInterval(function() {
    renderer.draw(step, r);
    advanceTime();
  }, settings.REFRESH);

  function advanceTime() {
    step++;
    if (step > settings.STEPS) { step = 0; }
  };
});
