'use strict'

const assert = require('chai').assert
const pmongo = require('promised-mongo')
const argv = require('minimist')(process.argv.slice(2));
const restClient = require('request-promise')
const serverPackage = require('../server')
const moment = require('moment')
const Q = require('Q')
const mockData = require('./mockData')
const _ = require('underscore')

let server, db
const port = 4000

let catchError = (doneFunc) => {
    return (err) => {
        console.log('caught error in test', err)
        assert(false, 'caught error in test ' + err + '\n' + err.stack)
        if (doneFunc) {
            doneFunc()
        }
    }
}

before((done) => {
    server = serverPackage.init(argv)

    db = pmongo('mongodb://localhost/furnace')

    Q.all([
        db.collection('furnaceStatus').drop(),
        db.collection('furnaceHistory').drop(),
        db.collection('indoorTemp').drop()
    ])
        .then(() => {
            return db.collection('furnaceHistory').drop()
        })
        .then(() => {
            done()
        })
        .catch(catchError(done))
})

describe('the furnace monitor', () => {
    it('should allow posting status updates', (done) => {
        let post = {
            method: 'POST',
            json: true,
            body: {
                dateTime: moment().format(),
                running: true
            },
            uri: 'http://localhost:$port/furnace/api/updateStatus'.replace('$port', port),
            headers: {
                'Content-Type': 'application/json'
            }
        }

        restClient(post)
            .then((postResult) => {
                console.log('postresult', postResult)

                return db.collection('furnaceStatus').count()
            })
            .then((cnt) => {
                assert.equal(cnt, 1, 'count should be 1')

                return db.collection('furnaceHistory').count()
            })
            .then((cnt) => {
                assert.equal(cnt, 1)
                post.body.running = false

                return restClient(post)
            })
            .then(() => {
                return db.collection('furnaceStatus').count()
            })
            .then((cnt) => {
                assert.equal(cnt, 1, 'furnace status count should still only be 1')
                return db.collection('furnaceHistory').count()
            })
            .then((cnt) => {
                assert.equal(cnt, 2, 'furnace history count should now be 2')
            })
            .then(() => {
                done()
            })
            .catch(catchError(done))

    })

    it('should allow retrieving current status', (done) => {
        let req = {
            method: 'GET',
            uri: 'http://localhost:$port/furnace/api/furnaceStatus'.replace('$port', port),
            json: true
        }

        restClient(req)
            .then((response) => {
                assert.equal(response.running, false, 'incorrect running status')
            })
            .then(() => {
                done()
            })
            .catch(catchError(done))
    })


    it('should allow retrieving furnace history', (done) => {

        let req = {
            method: 'GET',
            uri: 'http://localhost:$port/furnace/api/furnaceHistory'.replace('$port', port),
            json: true
        }

        // clear DBs to start
        Q.all([
            db.collection('furnaceHistory').drop(),
            db.collection('indoorTemp').drop()
        ])
            .then(() => {
                // insert mock data
                return Q.all([
                    db.collection('furnaceHistory').insert(mockData.mockFurnaceHistory),
                    db.collection('indoorTemp').insert(mockData.mockIndoorTemp)
                ])
            })
            .then(() => {
                return restClient(req)
            })
            .then((response) => {
                console.log('response', response)
                assert.equal(response.length, 5, 'history length is wrong')
                _.each(response, (r) => {
                    assert.isDefined(r.indoorTempF, 'missing indoorTempF')
                    assert.isDefined(r.running, 'missing running')
                })
            })
            .then(() => {
                done()
            })
            .catch(catchError(done))
    })

    it('should allow retrieving furnace total runtime', (done) => {

        let req = {
            method: 'GET',
            uri: 'http://localhost:$port/furnace/api/totalRuntime'.replace('$port', port),
            json: true
        }

        restClient(req)
            .then((response) => {
                console.log('response', response)
                assert.equal(response.totalRunTimeMins, 15, 'total run time is wrong')
            })
            .then(() => {
                done()
            })
            .catch(catchError(done))
    })

    it('should allow posting an indoor temperature update', (done) => {
        let req = {
            method: 'POST',
            uri: 'http://localhost:$port/furnace/api/updateIndoorTemp'.replace('$port', port),
            json: true,
            resolveWithFullResponse: true
        }

        restClient(req)
            .then((response) => {
                assert.equal(response.statusCode, 201, 'response code is wrongo!')
            })
            .then(() => {
                done()
            })
            .catch(catchError(done))
    })
})


after(() => {
    server.close()

})

