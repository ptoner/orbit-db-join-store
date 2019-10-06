// @ts-nocheck

const rimraf = require('rimraf')
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const JoinStore = require('../src/JoinStore')
var assert = require('assert');

rimraf.sync('./orbitdb');

describe("Test JoinStore", async () => {

    let ipfs
    let orbitDb

    let joinStore
    let address 

    let db1 
    let db2 
    let db3 

    let db1Address
    let db2Address
    let db3Address 


    before("Before", async () => {

        OrbitDB.addDatabaseType(JoinStore.type, JoinStore)

        ipfs = await IPFS.create()
        orbitDb = await OrbitDB.createInstance(ipfs)
    })

    it("should join together 3 different feeds", async () => {

        joinStore = await orbitDb.open("testjoin", {
            create: true,
            type: "joinstore"
        })

        address = joinStore.address.toString()

        db1 = await orbitDb.feed('1')
        db2 = await orbitDb.feed('2')
        db3 = await orbitDb.feed('3')

        db1Address = db1.address.toString()
        db2Address = db2.address.toString()
        db3Address = db3.address.toString()


        await db1.add('A')
        await db1.add('B')
        await db1.add('C')
        await db2.add('D')
        await db2.add('E')
        await db2.add('F')
        await db3.add('G')
        await db3.add('H')
        await db3.add('I')


        await joinStore.addStore(db1)
        await joinStore.addStore(db2)
        await joinStore.addStore(db3)

        await joinStore.join()

        assert.equal(joinStore._oplog.values.length, 9)

    })

    it("should reopen and still have a reference to the joined stores", async () => {

        await joinStore.close()

        joinStore = await orbitDb.open(address)

        await joinStore.loadStores(orbitDb)
        
        assert.equal(joinStore.stores.length, 3)
        assert.equal(joinStore.stores[0].address.toString(), db1Address)
        assert.equal(joinStore.stores[1].address.toString(), db2Address)
        assert.equal(joinStore.stores[2].address.toString(), db3Address)

    })


    it("should reopen reload and have the 9 items", async () => {

        await joinStore.close()

        joinStore = await orbitDb.open(address)

        await joinStore.loadStores(orbitDb)
        await joinStore.load()

        assert.equal(joinStore.index.length, 9)

    })


})
