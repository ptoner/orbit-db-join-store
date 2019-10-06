'use strict'

const Store = require('orbit-db-store')


class JoinStore extends Store {

  constructor (ipfs, id, dbname, options = {}) {
    super(ipfs, id, dbname, options)
    this._type = 'joinstore'
    this._stores = []
  }

  addStore(store) {
    this._stores.push(store)
  }


  async join() {

    const tmpID = this._oplog.id

    for (let store of this._stores) {
        this._oplog._id = store._oplog.id
        await this._oplog.join(store._oplog)
    }

    this._oplog._id = tmpID

  }

  static get type () {
    return 'joinstore'
  }



}

module.exports = JoinStore