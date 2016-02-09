#!/usr/bin/env node

'use strict'

module.exports = (() => {

    const argv = require('minimist')(process.argv.slice(2))
    let server = require('./server')
    let sampleOutdoorTemp = require('./sampleOutdoorTemp')

    if (argv.sampleOutdoorTemp) {
        sampleOutdoorTemp.sample()
    } else {
        server.init(argv)
    }


})()