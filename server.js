#!/usr/bin/env node

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


module.exports = (() => {

    // this is the frequency in mins that we expect to take measurements for indoor temp, outdoor temp, and furnace
    // this is needed to correlate the data
    // i.e. if we have a furnace measurement at time X, we expect there to be a 'matching' indoor temp measurement
    // that exists 'around' the same time, so between X - frequency / 2 and X + frequency / 2
    const measurementFrequencyMins = 5

    const statusCollectionName = 'furnaceStatus'
    const historyCollectionName = 'furnaceHistory'
    const indoorTempCollectionName = 'indoorTemp'
    const outdoorTempCollectionName = 'outdoorTemp'
    const upstairsTempCollectionName = 'upstairsTempAndLight'

    const furnaceStatusURL = '/furnace/api/furnaceStatus'
    const furnaceHistoryURL = '/furnace/api/furnaceHistory'
    const furnaceUpdateStatusURL = '/furnace/api/updateStatus'
    const furnaceTotalRuntimeURL = '/furnace/api/totalRuntime'
    const indoorTempUpdateURL = '/furnace/api/updateIndoorTemp'
    const upstairsTempAndLightURL = '/furnace/api/updateUpstairsTempAndLight'
    const getUpstairsTempAndLight = '/furnace/api/tempAndLight'
    const defaultPort = 4000

    let dbConnectionString = 'mongodb://localhost/furnace'
    let password, db, statusCollection, historyCollection, indoorTempCollection, outdoorTempCollection, port, upstairsTempCollection


    let authFilter = (req, res, next) => {
        const allowedURLs = [
            '/furnace/api/login',
            '/',

            // todo remove!!
            furnaceUpdateStatusURL,
            furnaceStatusURL,
            furnaceHistoryURL,
            furnaceTotalRuntimeURL,
            indoorTempUpdateURL,
            upstairsTempAndLightURL,
            getUpstairsTempAndLight
        ]

        const allowedPatterns = [
            '^.*?\.css',
            '^.*?\.js',
            '^.*?\.html',
            '^.*?\.png'
        ]

        console.log('req path', req.path)


        var allowedByPattern = function () {
            return _.find(allowedPatterns, function (p) {
                return req.path.match(new RegExp(p)) !== null;
            });
        };

        if (_.contains(allowedURLs, req.path) || allowedByPattern()) {
            next();
        } else {

            if (req.session.isLoggedIn !== true) {
                res.sendStatus(401);
            } else {
                next();
            }
        }
    }

    let handleFurnaceRuntime = (req, res, next) => {
        let previousHours = req.query.previousHours || 24
        let q = {
            dateTime: {"$gte": new moment().subtract(previousHours, 'hours').toDate()}
        }
        historyCollection.find(q)
            .then((qr) => {
                let total = _.foldl(qr, (accum, record) => {
                    // this is kid of cheating.  I happen to know that we're checking exactly every 5 minutes
                    // so when the record is running, that means it was running for approx 5 minutes
                    return record.running ? accum + 5 : accum
                }, 0)
                res.json({'totalRunTimeMins': total})
            })
            .catch((err) => {
                console.log(err)
                res.sendStatus(500)
            })
    }


    let handleFurnaceStatus = (req, res, next) => {
        statusCollection.findOne({})
            .then((one) => {
                res.json(one)
            })
            .catch((err) => {
                console.log(err)
                res.sendStatus(500)
            })
    }

    let handleFurnaceHistory = (req, res, next) => {
        let previousHours = req.query.previousHours || 24
        let q = {
            dateTime: {"$gte": new moment().subtract(previousHours, 'hours').toDate()}
        }

        // here is where we'll have to merge furnace history with indoor temp
        historyCollection.find(q)
            .then((furnaceData) => {
                console.log('got furnace data', furnaceData)
                let promises = _.map(furnaceData, (furnaceRecord) => {

                    return new Promise((resolveFunc, rejectFunc) => {

                        let beforeTime = moment(furnaceRecord.dateTime).subtract(Math.ceil(measurementFrequencyMins / 2) + 1, 'minutes')
                        let afterTime = moment(furnaceRecord.dateTime).add(Math.ceil(measurementFrequencyMins / 2) + 1, 'minutes')

                        // find a matching indoor temp record
                        let tempQ = {
                            dateTime: {
                                "$gte": beforeTime.toDate(),
                                "$lt": afterTime.toDate()
                            }

                        }
                        indoorTempCollection.findOne(tempQ)
                            .then((matchingTempRecord) => {
                                console.log('matching temp record', matchingTempRecord)
                                if (matchingTempRecord) {
                                    furnaceRecord.indoorTempF = matchingTempRecord.tempF
                                } else {
                                    console.log('no matching indoor temp record found for', furnaceRecord, 'query', tempQ)
                                }

                                // just look for an outdoor temp reading that is less that the current time
                                let outdoorTempQ = {
                                    dateTime: {
                                        "$lte": furnaceRecord.dateTime
                                    }
                                }
                                return outdoorTempCollection.find(outdoorTempQ).sort({dateTime: -1}).limit(1)
                            })
                            .then((outdoorMatchingRecords) => {
                                if (outdoorMatchingRecords[0]) {
                                    furnaceRecord.outdoorTempF = outdoorMatchingRecords[0].tempF
                                } else {
                                    console.log('no matching outdoor temp record found for', furnaceRecord, 'query', tempQ)
                                }
                                resolveFunc(furnaceRecord)
                            })
                            .catch((err) => {
                                rejectFunc(err)
                                console.log('caught error looking up matching temp', err)
                            })
                    })

                })
                // NOTE : this could result in a LOT of parallel queries
                return Q.all(promises)
            })
            .then((mergedResults) => {
                console.log('SENDING RESPONSE', mergedResults)
                res.json(mergedResults)
            })
            .catch((err) => {
                console.log('CAUGHT ERROR in furnace history', err)
                res.sendStatus(500)
            })
    }

    let handleFurnaceUpdate = (req, res, next) => {
        // handle a post on the server status
        /*
         Post will be in the form
         {
         "dateTime" : "",
         "running" : true | false
         }
         */

        console.log('body', req.body)
        let bodyWithId = req.body
        bodyWithId.id = 1
        bodyWithId.dateTime = moment(bodyWithId.dateTime).toDate()

        statusCollection.update({id: 1}, bodyWithId, {upsert: true, multi: false})
            .then((insertRes) => {
                console.log('insertResult', insertRes)
                return historyCollection.insert(req.body)
            })
            .then((insertRes) => {
                res.sendStatus(201)
            })
            .catch((err) => {
                console.log('error on update status', err)
                res.sendStatus(500)
            })
    }


    let handleIndoorTempUpdate = (req, res, next) => {
        // handle a post that updates temperature
        console.log('temp post body', req.body)
        let b = req.body
        b.dateTime = moment().toDate()
        indoorTempCollection.insert(b)
            .then((result) => {
                res.sendStatus(201)
            })
            .catch((err) => {
                console.log('error on post indoor temp', err)
            })
    }


    let handleUpstairsTempAndLightUpdate = (req, res, next) => {
        console.log('post body', req.body)
        let b = req.body
        b.dateTime = moment().toDate()
        upstairsTempCollection.insert(b)
            .then((result) => {
                res.sendStatus(201)
            })
            .catch((err) => {
                console.log('error on post upstairs temp', err)
            })

    }


    let handleUpstairsTempAndLightGet = (req, res, next) => {
      upstairsTempCollection.find()
        .then((data) => {
            res.send(data);
        })
        .catch((err) => {
            console.log('error',err);
        })
    }


    let init = (argv) => {
        console.log('argv', argv)
        // read a password file
        try {
            password = fs.readFileSync(passwordFile, 'utf-8').trim()
        } catch (err) {
            console.log('couldnt read password file so using something really hard')
            password = '8787*&^ghgjhgj'
        }
        port = argv.port || defaultPort

        dbConnectionString = argv.dbConnectionString || dbConnectionString
        db = pmongo(dbConnectionString)
        statusCollection = db.collection(statusCollectionName)
        historyCollection = db.collection(historyCollectionName)
        indoorTempCollection = db.collection(indoorTempCollectionName)
        outdoorTempCollection = db.collection(outdoorTempCollectionName)
        upstairsTempCollection = db.collection(upstairsTempCollectionName)

        let app = express()
        app.use(session({
            secret: '3kjhkhjk*&^*&^djhksjdhfa;;;fff',
            saveUninitialized: true,
            resave: false
        }))
        app.use(morgan('combined'))
        app.use(express.static('build'))
        app.use(bodyParser.urlencoded({
            extended: true
        }))

        app.use(bodyParser.json())

        app.use(authFilter)

        app.get(furnaceStatusURL, handleFurnaceStatus)
        app.get(furnaceHistoryURL, handleFurnaceHistory)
        app.get(furnaceTotalRuntimeURL, handleFurnaceRuntime)
        app.post(furnaceUpdateStatusURL, handleFurnaceUpdate)
        app.post(indoorTempUpdateURL, handleIndoorTempUpdate)
        app.post(upstairsTempAndLightURL, handleUpstairsTempAndLightUpdate)
        app.get(getUpstairsTempAndLight, handleUpstairsTempAndLightGet)

        console.log('listening on', port)
        return app.listen(port)
    }

    return {
        init: init
    }


})()
