"use strict";
var Promise = require("bluebird");
var LRU = require("lru-cache-plus");

function buildCache() {
  return new LRU({
    length: function (v) {
      return v && v.length || 1;
    }
  });
}

function AsyncCache(cache) {
  this.cache = cache || buildCache();
  this.pending = {};
}

AsyncCache.prototype.lookup = function (key, resolveFn, hitFn) {
  var self = this;
  function inner(hitFn) {
    var resolvedCallback = function (err, hit, cacheHeader) {
      if (err) return hitFn(err);
      self.cache.set(key, hit, cacheHeader);
      if (self.pending[key]) {
        self.pending[key].forEach(function (callback) {
          callback(null, hit);
        });
        delete self.pending[key];
      }
    };
    var hit = self.cache.get(key);
    if (hit !== undefined) {
      hitFn(null, hit);
    } else {
      if (self.pending[key]) {
        self.pending[key].push(hitFn);
      } else {
        self.pending[key] = [hitFn];
        resolveFn(resolvedCallback);
      }
    }
  }

  if (hitFn) {
    inner(hitFn);
  } else {
    return new Promise(function (resolve, reject) {
      inner(function (err, hit) {
        if (err) return reject(err);
        return resolve(hit);
      });
    });
  }
};

module.exports = AsyncCache;