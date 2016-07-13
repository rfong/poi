var app = angular.module('PoiApp', []);


app.controller('PoiCtrl', function($scope, $http) {

  $scope.options = {};
  $scope.patternNames = ['---'].concat(_.keys(patterns));
  $scope.selectedPatternNames = ['extension', 'four_petal_antispin'];
  $scope.getSelectedPatterns = function() {
    return _.map(
      _.filter($scope.selectedPatternNames, function(p) {
        return p in patterns;
      }),
      function(p) { return patterns[p]; });
  };

  $scope.setOption = function(option, value) {
    // These options are dynamically read by the plotter, so we don't need
    // to do anything else. I know, it's gross :x
    window.options[option] = (value===undefined) ? $scope.options[option] : value;
  };

  $scope.setSpeed = function(speed) {
    var multiplier = Math.pow(1.5, -speed);
    settings.REFRESH = 25 * multiplier;
    clearInterval($scope.loop);
    $scope.runMainLoop();
  };

  $scope.updatePatterns = function() {
    $scope.renderer.set_patterns($scope.getSelectedPatterns());
  };

  $scope.getPatterns = function(patternNames) {
    return _.map(patternNames, function(p) {
      if (p in patterns)
        return patterns[p];
    });
  };

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
        initial_patterns = $scope.getSelectedPatterns();
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


// Checkbox control directive
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
