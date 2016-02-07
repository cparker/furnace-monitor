'use strict';

/**
 * @ngdoc function
 * @name pgNgMinimalApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the carMonitorApp
 */
angular.module('furnaceMonitorApp')
    .controller('mainCtrl', ['$scope', 'dataService', function ($scope, dataService) {

        var now = moment();

        $scope.hello = 'HELLO... is it me youre looking for?';

        dataService.getStatus()
            .success(function (status) {
                $scope.furnaceOne = status;
                $scope.furnaceOne.statusDateFromNow = moment(status.dateTime).fromNow();
            })
            .error(function (er) {
                console.log(er);
            });

        dataService.getHistory()
            .success(function (history) {
                /*
                 for the chart, we need data like this
                 [
                 ['dateTime', 'furnace status'],
                 [javascript date, 0 or 1]
                 ]
                 */
                console.log(history);
                var chartData = [
                    ['dateTime', 'furnace status']
                ];
                var chartPairs = _.map(history, function (rec) {
                    var jsDate = moment(rec.dateTime).toDate();
                    var runningValue = rec.running ? 1 : 0;
                    return [jsDate, runningValue];
                });

                $scope.chartObject.data = chartData.concat(chartPairs);
            })
            .error(function (er) {
                console.log(er);
            });


        dataService.getTotalRuntime()
            .success(function (runtime) {
                var dur = moment.duration(runtime.totalRunTimeMins,'minutes');
                $scope.totalRunTimeHours = dur.get('h');
                $scope.totalRunTimeMins = dur.get('m');
            })


        $scope.furnaceOne = {
            dateTime: new Date(),
            running: true
        };

        $scope.chartObject = {};

        $scope.chartObject.type = 'AreaChart';

        /*
         $scope.chartObject.data = [
         ['dateTime', 'expenses'],
         [moment().subtract(12, 'hours').toDate(), 1],
         [moment().subtract(11, 'hours').toDate(), 1],
         [moment().subtract(10, 'hours').toDate(), 0],
         [moment().subtract(9, 'hours').toDate(), 0],
         [moment().subtract(8, 'hours').toDate(), 1],
         [moment().subtract(7, 'hours').toDate(), 1],
         [moment().subtract(6, 'hours').toDate(), 0],
         [moment().subtract(5, 'hours').toDate(), 0],
         [moment().subtract(4, 'hours').toDate(), 1],
         [moment().subtract(3, 'hours').toDate(), 1]
         ];
         */

        $scope.chartObject.options = {
            title: 'Furnace on/off over time',
            backgroundColor: '#c8c8c8',
            legend: {
                position: 'none'
            },

            chartArea: {
                left: 40,
                top: 10,
                width: '100%'
            },
            vAxis: {
                ticks: [{v: 0, f: 'OFF'}, {v: 1, f: 'ON'}]
            },
            colors: ['green'],
            hAxis: {
                format: 'hh:mm a',
                slantedText: true,
                gridlines: {count: 15}
            }
        };

    }]);
