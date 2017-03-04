'use strict';
const ITEM_LIMIT = 100;
const Promise = require('bluebird');
const asyncFunc = Promise.coroutine;

class BoxAutoPageUtilities {
  
  static autoPageWithStreamAsync(client, manager, methodName, id, options) {
    return asyncFunc(function* () {
      var collection = [];
      options = options || {};
      options.limit = options.limit || ITEM_LIMIT;
      return yield continuePagingWithStream(client, manager, methodName, id, options, collection);
    })();
    function continuePagingWithStream(client, manager, methodName, id, options, collection) {
      return asyncFunc(function* () {
        var keepGoing = true;
        let results;
        if (id) {
          results = yield client[manager][methodName](id, options);
        } else {
          results = yield client[manager][methodName](options);
        }
        collection = collection.concat(results.entries);
        keepGoing = (results.next_stream_position && results.entries.length > 0);
        if (keepGoing) {
          options.stream_position = results.next_stream_position;
          return yield continuePagingWithStream(client, manager, methodName, id, options, collection);
        } else {
          return collection;
        }
      })();

    }
  }
}

module.exports = BoxAutoPageUtilities;