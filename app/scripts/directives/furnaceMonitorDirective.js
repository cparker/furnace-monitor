'use strict';


angular.module('furnaceMonitorApp')
    .directive('furnaceStatus', function () {
        return {
            restrict: 'E',
            scope: {},
            templateUrl: 'furnace-status.html'
        }

    });
