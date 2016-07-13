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

  $scope.setOption = function(option) {
    // These options are dynamically read by the plotter, so we don't need
    // to do anything else. I know, it's gross :x
    window.options[option] = $scope.options[option];
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

  $scope.initialize = function() {
    var canvas = $('#canvas').get(0),
        ctx = canvas.getContext("2d"),
        theta = 0,
        origin = new Vector(300, 300),
        r = 125,
        initial_patterns = $scope.getSelectedPatterns();

    $scope.renderer = new TravelingPlotter(
      ctx, origin.x, origin.y, initial_patterns);

    settings.canvas.width = canvas.width;
    settings.canvas.height = canvas.height;

    // main loop
    setInterval(function() {
      $scope.renderer.draw(theta, r);
      advanceTime();
    }, settings.REFRESH);

    function advanceTime() {
      theta += settings.get_d_theta();
      if (theta > 2*Math.PI) { theta = 0; }
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
