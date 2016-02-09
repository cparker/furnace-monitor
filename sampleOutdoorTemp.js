'use strict'


const express = require('express')
const morgan = require('morgan')
const _ = require('underscore')
const fs = require('fs')
const bodyParser = require('body-parser')
const session = require('express-session')
const pmongo = require('promised-mongo')
const moment = require('moment')
const Q = require('q')
const restClient = require('request-promise')

module.exports = (() => {


    const wuAPIKeyFilename = '.wuAPIKey'
    const zip = '80027'
    const collectionName = 'outdoorTemp'
    const rfc822DateFormat = 'ddd, DD MMM gggg HH:mm:ss ZZ'

    let dbConnectionString = 'mongodb://localhost/furnace'
    let db, wuAPIKey, outdoorTempCollection

    let wuConditionsAPI = (key, zip) => {
        return 'http://api.wunderground.com/api/$key/conditions/q/$zip.json'.replace('$key', key).replace('$zip', zip)
    }

    /*
        This will be called on a cron every 5 minutes or so
     */
    let sample = () => {

        // get our API key
        wuAPIKey = fs.readFileSync(wuAPIKeyFilename, 'utf-8').trim()

        db = pmongo(dbConnectionString)
        outdoorTempCollection = db.collection(collectionName)

        // call the API to get current weather
        let conditionsRequest = {
            uri: wuConditionsAPI(wuAPIKey, zip),
            json: true
        }

        return restClient(conditionsRequest)
            .then((conditions) => {

                if (conditions.current_observation.observation_time_rfc822 && conditions.current_observation.temp_f) {

                    console.log('',conditions.current_observation.observation_time_rfc822 , conditions.current_observation.temp_f)

                    let record = {
                        dateTime: moment(conditions.current_observation.observation_time_rfc822,rfc822DateFormat).toDate(),
                        tempF: conditions.current_observation.temp_f
                    }

                    return outdoorTempCollection.insert(record)

                } else {
                    console.log('some fields were missing, no sample')
                    return Q('did not insert')
                }

            })
            .then((res) => {
                console.log('insert result', res)
            })
            .then(() => {
                db.close()
            })
            .catch((err) => {
                console.log('caught error getting conditions', err)
            })
    }

    return {
        sample : sample
    }


})()