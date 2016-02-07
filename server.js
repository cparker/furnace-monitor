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


module.exports = (() => {


    const statusCollectionName = 'furnaceStatus'
    const historyCollectionName = 'furnaceHistory'

    const furnaceStatusURL = '/furnace/api/furnaceStatus'
    const furnaceHistoryURL = '/furnace/api/furnaceHistory'
    const furnaceUpdateStatusURL = '/furnace/api/updateStatus'
    const furnaceTotalRuntimeURL = '/furnace/api/totalRuntime'
    const defaultPort = 4000

    let dbConnectionString = 'mongodb://localhost/furnace'
    let password, db, statusCollection, historyCollection, port


    let authFilter = (req, res, next) => {
        const allowedURLs = [
            '/furnace/api/login',
            '/',

            // todo remove!!
            furnaceUpdateStatusURL,
            furnaceStatusURL,
            furnaceHistoryURL,
            furnaceTotalRuntimeURL
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
        historyCollection.find(q)
            .then((qr) => {
                res.json(qr)
            })
            .catch((err) => {
                console.log(err)
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

        console.log('listening on', port)
        return app.listen(port)
    }

    return {
        init: init
    }


})()
