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
  $scope.selectedPatternNames = ['n_petal_antispin', 'extension'];

  // Generator parameters, if selected
  $scope.patternGeneratorOptions = repeat({}, $scope.selectedPatternNames.length);

  /* Convenience functions & checkers */

  $scope.getPatterns = function(patternNames) {
    if (!patternNames) { patternNames = $scope.selectedPatternNames; }
    return _.map(
      _.filter(patternNames, function(p) {
        return p in patterns;
      }),
      function(p) { return patterns[p]; });
  };

  $scope.isSelectedPatternGenerator = function(i) {
    /* Is the i'th pattern a generator */
    return $scope.selectedPatternNames[i] in pattern_generators;
  }

  /* Methods that pass configuration changes to the renderer */

  $scope.handlePatternSelect = function(i) {
    /* Handler for pattern selector */
    var pattern_name = $scope.selectedPatternNames[i];
    if (!pattern_name || pattern_name == $scope.NULL_SELECT_VALUE) {
      $scope.patternGeneratorOptions[i] = {};
      $scope.updatePattern(i);
      return;
    }
    // again, this assumes pattern names and generator names don't overlap...
    // Selected a generative pattern; set up its interface options
    if (pattern_name in pattern_generators) {
      var generator = pattern_generators[pattern_name];
      $scope.patternGeneratorOptions[i] = {
        name: pattern_name,
        args: generator.default_args,
        argNames: generator.argnames || [],
        argSpecs: generator.args,
      };
      $scope.showGeneratedPattern(i);
    }
    // Selected pattern preset; directly update renderer
    else if (pattern_name in patterns) {
      $scope.patternGeneratorOptions[i] = {};
      $scope.updatePattern(i, patterns[pattern_name]);
    }
  };

  $scope.showGeneratedPattern = function(i) {
    /* Handler to update the renderer once a generator's params are set */
    var generator = pattern_generators[$scope.selectedPatternNames[i]];
    var pattern = generator.generator.apply(
      null, $scope.patternGeneratorOptions[i].args);
    $scope.renderer.patterns[i] = pattern;
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

  $scope.setSpeed = function(speed) {
    var multiplier = Math.pow(1.5, -speed);
    settings.REFRESH = 25 * multiplier;
    clearInterval($scope.loop);
    $scope.runMainLoop();
  };

  $scope.setOption = function(option, value) {
    // These options are dynamically read by the plotter, so we don't need
    // to do anything else. I know, it's gross :x
    window.options[option] = (value===undefined) ? $scope.options[option] : value;
  };

  /* Main */

  $scope.runMainLoop = function() {
    $scope.loop = setInterval(function() {
      $scope.renderer.draw($scope.theta, $scope.r);
      $scope.advanceTime();
    }, settings.REFRESH);
  };

  $scope.initialize = function() {
    var canvas = $('#canvas').get(0),
        ctx = canvas.getContext("2d"),
        origin = new Vector(300, 300),
        initial_patterns = $scope.getPatterns();
    $scope.r = 125;
    // TODO: poi to arm ratio
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

/* Directive for ranged numerical param config dropdown
 * :attr default: initial value
 * :attr start: start value || 1
 * :attr stop : stop value || 1
 * :attr step: amount to increment || 1
 */
app.directive('rangedParamDropdown', function() {
  return {
    restrict: 'A',
    scope: {
      step: '=',
      start: '=',
      stop: '=',
      default: '=',
      callback: '&',
    },
    template: function(element, attrs) {
      return '' +
      '<span>' +
      '  <select ng-model="model" ' +
      '          ng-change="callback(model)" ' +
      '          ng-options="v as v for v in values">' +
      '  </select>' +
      '</span>';
    },
    link: function(scope, element, attrs) {
      _.each(['step', 'start', 'stop'], function(prop) {
        scope[prop] = parseInt(scope[prop]);
        if (!_.isNumber(scope[prop]) || _.isNaN(scope[prop])) {
          scope[prop] = 1;
        }
      });
      scope.values = _.range(scope.start, scope.stop + scope.step, scope.step);
      scope.model = scope.default;

      scope.callback = scope.callback();  // unwrap the callback
    },
  };
});
