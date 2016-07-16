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

  // Length should not change, please pretend this is statically allocated -_-
  $scope.selectedPatternNames = ['extension', 'four_petal_antispin'];

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
    if (!pattern_name || pattern_name == $scope.NULL_SELECT_VALUE) { return; }
    // again, this assumes pattern names and generator names don't overlap...
    // Selected a generative pattern; set up its interface options
    if (pattern_name in pattern_generators) {
      var generator = pattern_generators[pattern_name];
      $scope.patternGeneratorOptions[i] = {
        name: pattern_name,
        args: generator.default_args,
        argNames: generator.argnames || [],
      };
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

  $scope.updatePattern = function(i, pattern) {
    /* Updates the i'th pattern in the renderer */
    // TODO: force renderer to have fixed size patterns array
    pattern = pattern || patterns[i];
    if (!pattern) { return; }
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
  }; $scope.initialize();
});


// Checkbox config directive that passes option to renderer onchange
app.directive('controlCheckbox', function() {
  return {
    restrict: 'A',
    template: function(element, attributes) {
      return '' +
      '<span class="control">' + attributes.label +
      '  <input type="checkbox" ' +
      '         ng-model="options.' + attributes.name + '" ' +
      '         ng-init="options.' + attributes.name + '= ' + attributes.value + '; ' +
      '                  setOption(\'' + attributes.name + '\')" ' +
      '         ng-change="setOption(\'' + attributes.name + '\')" ' +
      '         />' +
      '</span>';
    },
  };
});
