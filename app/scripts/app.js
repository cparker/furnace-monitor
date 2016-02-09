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

var mock = false;

var mockFurnaceStatus = {
    'dateTime': new Date(),
    'running': true
};

var mockRuntime = {
    totalRunTimeMins: 15
};


var mockFurnaceHistory = _.chain(_.range(24 * 4))
    .map(function (n) {
        var now = moment();
        return {
            'dateTime': now.subtract(24 * 60 - n * 15, 'minutes').toDate(),
            'running': [true, false][Math.floor(Math.random() * 2)],
            'indoorTempF': Math.ceil(Math.random() * 15) + 60,
            'outdoorTempF': Math.ceil(Math.random() * 15) + 60
        };
    })
    .value();


app.run(function ($httpBackend) {


    if (mock) {
        $httpBackend.whenGET('furnace-status.html').passThrough();

        $httpBackend.whenGET('/furnace/api/furnaceStatus')
            .respond(200, mockFurnaceStatus);

        $httpBackend.whenGET('/furnace/api/furnaceHistory')
            .respond(200, mockFurnaceHistory);

        $httpBackend.whenGET('/furnace/api/totalRuntime')
            .respond(200, mockRuntime);
    }

    else {
        $httpBackend.whenGET(/.*/).passThrough();
        $httpBackend.whenPOST(/.*/).passThrough();
        $httpBackend.whenPUT(/.*/).passThrough();
    }

});
