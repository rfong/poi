var app = angular.module('PoiApp', []);


function repeat(o, n) {
  /* equivalent to pythonic [o]**n */
  return _.map(_.range(n), function(i) { return o; });
}

app.controller('PoiCtrl', function($scope, $http) {

  $scope.NULL_SELECT_VALUE = '---';
  $scope.options = {};

  // this construction assumes that pattern names and pattern generator
  // names never overlap; TODO should enforce this or add a delineator
  $scope.patternNameOptions = Array.prototype.concat(
    [$scope.NULL_SELECT_VALUE],
    _.keys(patterns),
    _.keys(pattern_generators)
  );

  /* Pattern initialization */

  // Length should not change, please pretend this is statically allocated -_-
  $scope.selectedPatternNames = [null, null];

  // Generator parameters, if selected
  $scope.patternGeneratorOptions = repeat({}, $scope.selectedPatternNames.length);

  var DEFAULT_PATTERNS = ['n_petal_antispin', 'n_petal_inspin'];

  /* Convenience functions & checkers */

  $scope.getPatterns = function(patternNames) {
    if (!patternNames) { patternNames = $scope.selectedPatternNames; }
    return _.map(
      _.filter(patternNames, function(p) {
        return p in patterns;
      }),
      function(p) { return patterns[p]; });
  };

  $scope.getPatternColor = function(patternIndex) {
    return settings.point_colors[patternIndex % settings.point_colors.length];
  };

  $scope.isSelectedPatternGenerator = function(i) {
    /* Is the i'th pattern a generator */
    return $scope.selectedPatternNames[i] in pattern_generators;
  }

  // Given a param specification, return an array of its value options
  $scope.getParamValues = function(argSpec) {
    if (_.isArray(argSpec.values)) { return argSpec.values; }
    _.each(['step', 'start', 'stop'], function(prop) {
      argSpec[prop] = parseInt(argSpec[prop]);
      if (!_.isNumber(argSpec[prop]) || _.isNaN(argSpec[prop])) {
        argSpec[prop] = 1;
      }
    });
    return _.range(argSpec.start, argSpec.stop + argSpec.step, argSpec.step);
  };

  /* Methods that pass configuration changes to the renderer */

  $scope.handlePatternSelect = function(i, preventUrlUpdate) {
    /* Handler for pattern selector */
    var pattern_name = $scope.selectedPatternNames[i];
    if (!pattern_name || pattern_name == $scope.NULL_SELECT_VALUE) {
      $scope.patternGeneratorOptions[i] = {};
      $scope.updatePattern(i);
      if (!pattern_name) { return; }
    }
    // again, this assumes pattern names and generator names don't overlap...
    // Selected a generative pattern; set up its interface options
    else if (pattern_name in pattern_generators) {
      var generator = pattern_generators[pattern_name];
      $scope.patternGeneratorOptions[i] = {
        name: pattern_name,
        args: _.pluck(generator.args, 'default'),
        argNames: _.pluck(generator.args, 'name'),
        argSpecs: generator.args,
      };
      $scope.showGeneratedPattern(i);
    }
    // Selected pattern preset; directly update renderer
    else if (pattern_name in patterns) {
      $scope.patternGeneratorOptions[i] = {};
      $scope.updatePattern(i, patterns[pattern_name]);
    }
    if (!preventUrlUpdate) { $scope.saveStateToUrlParams(); }
  };

  $scope.showGeneratedPattern = function(i, preventUrlUpdate) {
    /* Handler to update the renderer once a generator's params are set */
    var generator = pattern_generators[$scope.selectedPatternNames[i]];
    if (!generator) { return; }
    var pattern = generator.generator.apply(
      null, $scope.patternGeneratorOptions[i].args);
    $scope.renderer.patterns[i] = pattern;
    if (!preventUrlUpdate) { $scope.saveStateToUrlParams(); }
  };

  $scope.getPatternParamCallback = function(patternIndex, paramIndex) {
    /* Return a callback which updates the value for param `paramIndex` for
     * the `patternIndex`th generated pattern.
     */
    return function(value) {
      $scope.patternGeneratorOptions[patternIndex].args[paramIndex] = value;
      $scope.showGeneratedPattern(patternIndex);
    };
  };

  $scope.updatePattern = function(i, pattern) {
    /* Updates the i'th pattern in the renderer */
    // TODO: force renderer to have fixed size patterns array
    pattern = pattern || patterns[i];
    $scope.renderer.patterns[i] = pattern;
  };

  $scope.setSpeed = function() {
    var multiplier = Math.pow(1.5, -$scope.speed);
    options.REFRESH = 25 * multiplier;
    clearInterval($scope.loop);
    $scope.runMainLoop();
  };

  $scope.setPoiRatio = function() {
    options.poi_to_arm_ratio = $scope.poiRatio;
  };

  $scope.pauseHandler = function() {
    if ($scope.paused) {
      clearInterval($scope.loop);
    } else {
      $scope.setSpeed();
    }
  };

  $scope.setOption = function(option, value, preventUrlUpdate) {
    // These options are dynamically read by the plotter, so we don't need
    // to do anything else. I know, it's gross :x
    window.options[option] = (value===undefined) ? $scope.options[option] : value;
    if (!preventUrlUpdate) { $scope.saveStateToUrlParams(); }
  };

  $scope.setOptions = function(options, preventUrlUpdate) {
    if (!preventUrlUpdate) { $scope.saveStateToUrlParams(); }
    $scope.options = options;
    _.each($scope.options, function(val, key) {
      $scope.setOption(key, val, preventUrlUpdate);
    });
  };

  /* Permalinking */

  $scope.getUrlParams = function() {
    var params = _.object(_.map(
      window.location.search.substring(1).replace(/\/$/, '').split('&'),
      function(pair) { return pair.split('='); }
    ));
    return params;
  };

  // TODO: this is attached to a lot of updaters with a preventUpdate arg.
  // Would be nicer to figure out how to write a JS decorator that can require
  // an additional arg
  $scope.saveStateToUrlParams = function() {
    var params = _.extend($scope.options, {
      patterns: JSON.stringify($scope.selectedPatternNames),
      args: JSON.stringify(_.pluck($scope.patternGeneratorOptions, 'args')),
    });
    window.location.hash = $.param(params);
  };

  $scope.loadStateFromUrlParams = function() {
    var params = $.deparam(window.location.hash.substring(1));
    $scope.setOptions(params.options || {}, true);
    $scope.selectedPatternNames = (params.patterns ?
                                   JSON.parse(params.patterns) :
                                   DEFAULT_PATTERNS);
    params.args = (params.args ? JSON.parse(params.args) :
                   repeat(null, $scope.selectedPatternNames.length));
    _.each($scope.selectedPatternNames, function(name, i) {
      $scope.handlePatternSelect(i);   // setup pattern
      if (params.args[i]) {
        $scope.patternGeneratorOptions[i].args = params.args[i];  // override args
        $scope.showGeneratedPattern(i);  // update renderer
      }
    });
  };

  /* Main */

  $scope.runMainLoop = function() {
    $scope.loop = setInterval(function() {
      $scope.renderer.draw($scope.theta, $scope.r);
      $scope.advanceTime();
    }, options.REFRESH);
  };

  $scope.initialize = function() {
    var canvas = $('#canvas').get(0),
        ctx = canvas.getContext("2d"),
        origin = new Vector(300, 300),
        initial_patterns = $scope.getPatterns();
    $scope.r = 150;
    $scope.theta = 0;

    $scope.renderer = new TravelingPlotter(
      ctx, origin.x, origin.y, initial_patterns);

    settings.canvas.width = canvas.width;
    settings.canvas.height = canvas.height;

    $scope.runMainLoop();

    $scope.advanceTime = function() {
      $scope.theta += get_d_theta();
      if ($scope.theta > 2*Math.PI) { $scope.theta = 0; }
    };

    _.each($scope.selectedPatternNames, function(name, i) {
      $scope.handlePatternSelect(i);
    });

    // tmp test
    $scope.loadStateFromUrlParams();
  }; $scope.initialize();
});


/* Directive for config checkbox that passes option to renderer onchange
 * :attr label: label to display
 * :attr name: config variable name
 * :attr value: is checked?
 */
app.directive('controlCheckbox', function() {
  return {
    restrict: 'A',
    template: function(element, attrs) {
      return '' +
      '<span class="control">' + attrs.label +
      '  <input type="checkbox" ' +
      '         ng-model="options.' + attrs.name + '" ' +
      '         ng-init="options.' + attrs.name + '= ' + attrs.value + '; ' +
      '                  setOption(\'' + attrs.name + '\')" ' +
      '         ng-change="setOption(\'' + attrs.name + '\')" ' +
      '         />' +
      '</span>';
    },
  };
});
