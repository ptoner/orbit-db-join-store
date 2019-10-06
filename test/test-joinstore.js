const rimraf = require('rimraf')
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const JoinStore = require('../src/JoinStore')

rimraf.sync('./orbitdb');

;(async (IPFS, OrbitDB) => {


  OrbitDB.addDatabaseType(JoinStore.type, JoinStore)


  const ipfs = await IPFS.create()
  const orbitdb = await OrbitDB.createInstance(ipfs)

  let joinStore = await orbitdb.open("testjoin", {
    create: true, 
    type: "joinstore"
  })


  const db1 = await orbitdb.feed('1')
  const db2 = await orbitdb.feed('2')
  const db3 = await orbitdb.feed('3')


  await db1.add('A')
  await db1.add('B')
  await db1.add('C')
  await db2.add('D')
  await db2.add('E')
  await db2.add('F')
  await db3.add('G')
  await db3.add('H')
  await db3.add('I')


  joinStore.addStore(db1)
  joinStore.addStore(db2)
  joinStore.addStore(db3)

  await joinStore.join()

  console.log(joinStore._oplog.values.length)
  console.log(joinStore.index)

})(IPFS, OrbitDB)

