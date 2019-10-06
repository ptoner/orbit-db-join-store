'use strict'

const Store = require('orbit-db-store')
const path = require('path')


class JoinStore extends Store {

  constructor (ipfs, id, dbname, options = {}) {
    super(ipfs, id, dbname, options)
    this._type = 'joinstore'
    this._stores = []

    this.joinedStoresPath = path.join(this.id, 'joinedStores')

  }

  async loadStores(orbitdb) {

    let joinedStoreAddresses = await this._cache.get(this.joinedStoresPath)

    for (let joinedStoreAddress of joinedStoreAddresses) {
        this._stores.push(await orbitdb.open(joinedStoreAddress))
    }

  }

  async addStore(store) {

    this._stores.push(store)

    let joinedStoreAddresses = this._stores.map( store => store.address.toString())

    await this._cache.set(this.joinedStoresPath, joinedStoreAddresses)

  }


  async join() {

    const tmpID = this._oplog.id

    for (let store of this._stores) {
        this._oplog._id = store._oplog.id
        await this._oplog.join(store._oplog)
    }

    this._oplog._id = tmpID

  }

  get stores() {
      return this._stores
  }


  static get type () {
    return 'joinstore'
  }



}

module.exports = JoinStore