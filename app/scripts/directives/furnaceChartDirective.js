'use strict';


angular.module('furnaceMonitorApp')
    .directive('furnaceChart', function () {
        return {
            restrict: 'E',
            scope: {},
            templateUrl: 'furnace-chart.html'
        };

    });
