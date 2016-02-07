'use strict';


angular.module('furnaceMonitorApp')
    .directive('furnaceStatus', function () {
        return {
            restrict: 'E',
            scope: {
                furnaceStatus : '=furnaceStatus'
            },
            templateUrl: 'furnace-status.html'
        };

    });
