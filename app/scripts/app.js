'use strict';

/**
 * @ngdoc overview
 * @name pgNgMinimalApp
 * @description
 * # pgNgMinimalApp
 *
 * Main module of the application.
 */
angular
  .module('furnaceMonitorApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
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
