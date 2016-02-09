'use strict'


let moment = require('moment')
let now = moment()

module.exports = {

    "mockFurnaceHistory": [
        {
            "dateTime": now.toDate(),
            "running": true
        },
        {
            "dateTime": now.subtract(5, 'minutes').toDate(),
            "running": true
        },
        {
            "dateTime": now.subtract(10, 'minutes').toDate(),
            "running": true
        },
        {
            "dateTime": now.subtract(15, 'minutes').toDate(),
            "running": false
        },
        {
            "dateTime": now.subtract(20, 'minutes').toDate(),
            "running": false
        }
    ],

    "mockIndoorTemp": [
        {
            "dateTime": now.subtract(2, 'minutes').toDate(),
            "tempF": 65
        },
        {
            "dateTime": now.subtract(7, 'minutes').toDate(),
            "tempF": 66
        },
        {
            "dateTime": now.subtract(12, 'minutes').toDate(),
            "tempF": 67
        },
        {
            "dateTime": now.subtract(17, 'minutes').toDate(),
            "tempF": 68
        },
        {
            "dateTime": now.subtract(22, 'minutes').toDate(),
            "tempF": 69
        }

    ]
}


