'use strict'

const pWhilst = require('p-whilst')
const pMap = require('p-map')
const Entry = require('./entry')

class EntryIO {
  /**
   * Fetch log entries in parallel.
   * @param {IPFS} ipfs An IPFS instance
   * @param {string|Array<string>} hashes hashes of the entries to fetch
   * @param {Object} options
   * @param {number} options.length How many entries to fetch
   * @param {Array<Entry>} options.exclude Entries to not fetch
   * @param {number} options.concurrency Max concurrent fetch operations
   * @param {number} options.timeout Maximum time to wait for each fetch operation, in ms
   * @param {function(hash, entry, parent, depth)} options.onProgressCallback
   * @returns {Promise<Array<Entry>>}
   */
  static async fetchParallel (ipfs, hashes,
    { length = -1, exclude = [], concurrency = null, timeout, onProgressCallback } = {}) {
    const fetchOne = (hash) => EntryIO.fetchAll(ipfs, hash,
      { length, exclude, timeout, onProgressCallback })
    const getHashes = e => e.hash
    const uniquelyConcatArrays = (arr1, arr2) => {
      // Add any new entries to arr1
      const entryHashes = arr1.map(getHashes)
      arr2.forEach(entry => {
        if (entryHashes.indexOf(entry.hash) === -1) arr1.push(entry)
      })
      return arr1
    }
    const flatten = (arr) => arr.reduce(uniquelyConcatArrays, [])
    const hashesToFetch = Array.isArray(hashes) ? hashes.slice() : [hashes]
    concurrency = Math.max(concurrency || hashesToFetch.length, 1)

    const entries = await pMap(hashesToFetch, fetchOne, { concurrency: concurrency })
    // Flatten the results and get unique vals
    return flatten(entries)
  }

  /**
   * Fetch log entries sequentially.
   * @param {IPFS} ipfs An IPFS instance
   * @param {string|Array<string>} hashes hashes of the entries to fetch
   * @param {Object} options
   * @param {number} options.length How many entries to fetch
   * @param {Array<Entry>} options.exclude Entries to not fetch
   * @param {number} options.concurrency Max concurrent fetch operations
   * @param {number} options.timeout Maximum time to wait for each fetch operation, in ms
   * @param {function(hash, entry, parent, depth)} options.onProgressCallback
   * @returns {Promise<Array<Entry>>}
   */
  static async fetchAll (ipfs, hashes,
    { length = -1, exclude = [], timeout = null, onProgressCallback }) {
    let result = []
    let cache = {}
    let loadingQueue = Array.isArray(hashes)
      ? hashes.slice()
      : [hashes]

    // Add a hash to the loading queue
    const addToLoadingQueue = e => loadingQueue.push(e)

    // Add entries that we don't need to fetch to the "cache"
    exclude = exclude && Array.isArray(exclude) ? exclude : []
    var addToExcludeCache = e => {
      if (Entry.isEntry(e)) {
        result.push(e)
        cache[e.hash] = e
      }
    }
    exclude.forEach(addToExcludeCache)

    const shouldFetchMore = () => {
      return loadingQueue.length > 0 &&
          (result.length < length || length < 0)
    }

    const fetchEntry = () => {
      const hash = loadingQueue.shift()

      if (cache[hash]) {
        return Promise.resolve()
      }

      return new Promise(async (resolve, reject) => {
        // Resolve the promise after a timeout (if given) in order to
        // not get stuck loading a block that is unreachable
        const timer = timeout
          ? setTimeout(() => {
            console.warn(`Warning: Couldn't fetch entry '${hash}', request timed out (${timeout}ms)`)
            resolve()
          }, timeout)
          : null

        const addToResults = (entry) => {
          if (Entry.isEntry(entry)) {
            entry.next.forEach(addToLoadingQueue)
            result.push(entry)
            cache[hash] = entry
            if (onProgressCallback) {
              onProgressCallback(hash, entry, result.length)
            }
          }
        }

        // Load the entry
        try {
          const entry = await Entry.fromMultihash(ipfs, hash)
          addToResults(entry)
          resolve()
        } catch (e) {
          reject(e)
        } finally {
          clearTimeout(timer)
        }
      })
    }

    await pWhilst(shouldFetchMore, fetchEntry)
    return result
  }
}

module.exports = EntryIO
