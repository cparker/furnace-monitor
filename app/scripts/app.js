'use strict';

/**
 * @ngdoc overview
 * @name pgNgMinimalApp
 * @description
 * # pgNgMinimalApp
 *
 * Main module of the application.
 */
var app = angular
    .module('furnaceMonitorApp', [
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngRoute',
        'ngSanitize',
        'ngTouch',
        'ngMockE2E',
        'googlechart'
    ])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'mainCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    });

var mock = true;

var mockFurnaceStatus = {
    'dateTime': new Date(),
    'running': true
};


var mockFurnaceHistory = _.chain(_.range(24*4))
    .map(function (n) {
        var now = moment();
        return {
            'dateTime': now.subtract(24*60 - n*15, 'minutes').toDate(),
            'running': [true, false][Math.floor(Math.random() * 2)]
        };
    })
    .value();


app.run(function ($httpBackend) {

    $httpBackend.whenGET('furnace-status.html').passThrough();

    if (mock) {
        $httpBackend.whenGET('/furnace/api/furnaceStatus')
            .respond(200, mockFurnaceStatus);

        $httpBackend.whenGET('/furnace/api/furnaceHistory')
            .respond(200, mockFurnaceHistory);
    }

});
