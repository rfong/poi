// Plotter loosely based on https://gist.github.com/kazad/8bb682da198db597558c,
// totally different implementation though

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
    stroke_color: '#c2a7dd',
  },

  point: {
    color: '#f00',
    size: 10,
    stroke_color: '#fcc',
  },

  point_colors: ['#f00', '#00f', '#0f0'],  // lol hopefully we don't have more than 3 poi
};

settings.d_theta = 2 * Math.PI / settings.STEPS;

window.options = {};


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
};
Plotter.prototype = Object.create(CanvasRenderer.prototype);
_.extend(Plotter.prototype, {
  constructor: Plotter,

  draw: function(theta, r, phase_shift) {
    phase_shift = phase_shift || 0;
    this.draw_polar_point(theta + phase_shift, r);
  },

  refresh: function(theta, r) {
    this.reset();
    this.draw(theta, r);
  },

  set_origin: function(x, y) {
    this.origin = {x: x, y: y};
  },

  set_point_color: function(color) {
    this.point_color = color;
  },

  /* Convenience drawing methods */

  draw_polar_point: function(theta, radius) {
    this.draw_point(radius * Math.cos(theta), radius * Math.sin(theta));
  },

  draw_point: function(x, y) {
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1.5;
    this.draw_line_to_origin(x, y);
    
    this.ctx.fillStyle = this.point_color || settings.point.color;
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

  draw: function(theta, r) {
    this.reset();

    var self = this,
        args = arguments;
    _.each(this.patterns, function(pattern, i) {
      self.set_traveling_origin(pattern.traveling_function, theta, r);
      self.set_point_color(settings.point_colors[i % settings.point_colors.length]);

      if (window.options.show_hand_trace) {
        self.trace_origin(pattern, r);
      }
      if (window.options.show_pattern_trace) {
        self.trace_pattern(pattern, r);
      }

      // Draw
      self.constructor.prototype.__proto__.draw.apply(self, [
        theta * pattern.frequency, r, pattern.phase_shift
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
    this.ctx.strokeStyle = settings.point.stroke_color;
    var circle_fn = pattern_generators.circle(pattern.frequency);
    this.trace_function(
      function(theta, r) {
        return pattern.traveling_function(theta, r).add(circle_fn(theta, r));
      }, r);
  },

  trace_origin: function(pattern, r) {
    // Persistent trace of the origin's movement
    this.ctx.strokeStyle = settings.origin.stroke_color;
    this.trace_function(pattern.traveling_function, r);
  },

  trace_function: function(fn, r, phase_shift) {
    // Persistent trace of a function(theta, r)
    this.ctx.beginPath();
    this.ctx.lineWidth = 1.5;
    
    // simulate a full period
    // one extra point for smoothness
    for (var theta = 0; theta <= 2 * Math.PI; theta += settings.d_theta) {
      var coords = fn(theta, r);
      if (theta==0) {
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

  set_traveling_origin: function(traveling_function, theta, r) {
    var travel = traveling_function(theta, r),
        origin = [this.initial_origin.x + travel.x,
                  this.initial_origin.y + travel.y];
    this.set_origin.apply(this, origin);
  },

});


/* Traveling function signature:
 * :param theta: angle in radians
 * :param d: poi length (handle center to head center)
 * :returns: 2D Vector
 */
var traveling_functions = {

  // simple back and forth oscillation
  test: function(theta, d) {
    return new Vector(theta < Math.PI ? theta : 2*Math.PI - theta, 0);
  },

  // Circle
  extension: function(theta, r) {
    return new Vector(r * Math.cos(theta), r * Math.sin(theta));
  },

  // Circle phase shifted by π
  isolation: function(theta, r) {
    theta += Math.PI;
    return new Vector(r * Math.cos(theta), r * Math.sin(theta));
  },

};

// Parametric generators that return functions fitting the format above.
var pattern_generators = {

  /* :param n: number of sides
   * :param rotation: angle to phase shift, in radians, from pointing up
   * :param is_phase_shifted: flips an antispin to an inspin
   */
  polygon: function(n, is_phase_shifted, rotation) {
    var phase_shift = is_phase_shifted ? Math.PI/n : 0;
    rotation = (rotation || 0) + Math.PI/n;  // this rotates it to point up

    return function(theta, d) {
      theta += rotation;
      // polar equation for edge: cos(π/n) / cos((theta mod 2π/n) - π/n)
      var r = (d * (
        Math.cos(Math.PI/n) / Math.cos((theta + phase_shift) % (2*Math.PI/n) - Math.PI/n)
      ));
      return new Vector(r * Math.cos(theta), r * Math.sin(theta));
    };
  },
  
  circle: function(frequency) {
    return function(theta, r) {
      theta *= frequency;
      return new Vector(r * Math.cos(theta), r * Math.sin(theta));
    };
  },

};


// Complete pattern specifications
var patterns = {

  test: {
    frequency: -2,
    traveling_function: traveling_functions.isolation,
  },

  extension: {
    frequency: 1,
    traveling_function: traveling_functions.extension,
  },

  triquetra: {
    frequency: -2,
    traveling_function: pattern_generators.polygon(3),
  },

  four_petal_antispin: {
    frequency: -3,
    phase_shift: -Math.PI/2,
    traveling_function: pattern_generators.polygon(4),
  },

  four_petal_inspin: {
    frequency: -3,
    traveling_function: pattern_generators.polygon(4, true),
  },

};


// main
$(function() {
  var canvas = $('#canvas').get(0);
  var ctx = canvas.getContext("2d");
  var theta= 0;
  var origin = new Vector(300, 300);
  var r = 125;

  var renderer = new TravelingPlotter(
    ctx, origin.x, origin.y, [
      patterns.extension,
      patterns.triquetra,
      //patterns.four_petal_inspin,
      //patterns.four_petal_antispin,
    ]
  );

  settings.canvas.width = canvas.width;
  settings.canvas.height = canvas.height;

  // main loop
  setInterval(function() {
    renderer.draw(theta, r);
    advanceTime();
  }, settings.REFRESH);

  function advanceTime() {
    theta += settings.d_theta;
    if (theta > 2*Math.PI) { theta = 0; }
  };
});
