'use strict';


angular.module('furnaceMonitorApp')
    .factory('dataService', ['$http', function ($http) {
        return {

            getStatus: function () {
                return $http({
                    method: 'GET',
                    url: '/furnace/api/furnaceStatus'
                });
            },

            getHistory: function () {
                return $http({
                    method: 'GET',
                    url: '/furnace/api/furnaceHistory'
                });
            },

            getTotalRuntime: function () {
                return $http({
                    method: 'GET',
                    url: '/furnace/api/totalRuntime'
                });
            }


        };
    }]);