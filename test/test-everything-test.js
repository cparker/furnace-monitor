'use strict'

const assert = require('chai').assert
const pmongo = require('promised-mongo')
const argv = require('minimist')(process.argv.slice(2));
const restClient = require('request-promise')
const serverPackage = require('../server')
const moment = require('moment')

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
    db.collection('furnaceStatus').drop()
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
    })


    it('should allow retrieving furnace history', (done) => {

        let req = {
            method: 'GET',
            uri: 'http://localhost:$port/furnace/api/furnaceHistory'.replace('$port', port),
            json: true
        }

        restClient(req)
            .then((response) => {
                console.log('response', response)
                assert.equal(response.length, 2, 'history len should be 2')
            })
            .then(() => {
                done()
            })
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
                assert.equal(response.totalRunTimeMins,5,'total run time is wrong')
            })
            .then(() => {
                done()
            })
    })
})


after(() => {
    server.close()

})

