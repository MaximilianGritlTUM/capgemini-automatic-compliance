/**
 * WhitelistCache.js
 *
 * In-memory cache with TTL for whitelist data.
 * Caches T006 units, TCURC currencies, and other lookup data.
 *
 * @module utils/nonstandard/WhitelistCache
 */
sap.ui.define([
    "./FieldTypes"
], function (FieldTypes) {
    "use strict";

    /**
     * Default TTL in milliseconds (24 hours)
     * @constant {number}
     */
    var DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

    /**
     * Cache entry structure
     * @typedef {Object} CacheEntry
     * @property {Set<string>} data - Cached data set
     * @property {number} timestamp - When the entry was created
     * @property {number} ttl - Time to live in milliseconds
     */

    /**
     * WhitelistCache - manages cached whitelist data with TTL
     *
     * @class WhitelistCache
     * @param {Object} [options] - Configuration options
     * @param {number} [options.defaultTTL] - Default TTL in milliseconds
     */
    function WhitelistCache(options) {
        options = options || {};
        this._defaultTTL = options.defaultTTL || DEFAULT_TTL_MS;
        this._cache = {};
        this._loaders = {};
        this._loadingPromises = {};
    }

    /**
     * Check if a cache entry exists and is still valid
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    WhitelistCache.prototype.has = function (key) {
        var entry = this._cache[key];
        if (!entry) {
            return false;
        }
        return !this._isExpired(entry);
    };

    /**
     * Check if a cache entry has expired
     * @private
     * @param {CacheEntry} entry - Cache entry
     * @returns {boolean}
     */
    WhitelistCache.prototype._isExpired = function (entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    };

    /**
     * Get cached data synchronously (returns null if not cached or expired)
     * @param {string} key - Cache key
     * @returns {Set<string>|null}
     */
    WhitelistCache.prototype.get = function (key) {
        var entry = this._cache[key];
        if (!entry || this._isExpired(entry)) {
            return null;
        }
        return entry.data;
    };

    /**
     * Set cache entry
     * @param {string} key - Cache key
     * @param {Set<string>|Array<string>} data - Data to cache
     * @param {number} [ttl] - TTL in milliseconds (optional)
     */
    WhitelistCache.prototype.set = function (key, data, ttl) {
        // Convert array to Set if needed
        var dataSet = data instanceof Set ? data : new Set(data);

        this._cache[key] = {
            data: dataSet,
            timestamp: Date.now(),
            ttl: ttl || this._defaultTTL
        };
    };

    /**
     * Remove a cache entry
     * @param {string} key - Cache key
     */
    WhitelistCache.prototype.remove = function (key) {
        delete this._cache[key];
        delete this._loadingPromises[key];
    };

    /**
     * Clear all cache entries
     */
    WhitelistCache.prototype.clear = function () {
        this._cache = {};
        this._loadingPromises = {};
    };

    /**
     * Clear expired entries
     * @returns {number} - Number of entries cleared
     */
    WhitelistCache.prototype.clearExpired = function () {
        var count = 0;
        var self = this;
        Object.keys(this._cache).forEach(function (key) {
            if (self._isExpired(self._cache[key])) {
                delete self._cache[key];
                count++;
            }
        });
        return count;
    };

    /**
     * Register a loader function for a cache key
     * @param {string} key - Cache key
     * @param {Function} loaderFn - Async function that returns Set<string> or Array<string>
     */
    WhitelistCache.prototype.registerLoader = function (key, loaderFn) {
        this._loaders[key] = loaderFn;
    };

    /**
     * Get data from cache, or load it if not present/expired
     * Ensures only one load operation per key at a time
     *
     * @param {string} key - Cache key
     * @param {*} [loaderContext] - Optional context to pass to loader
     * @returns {Promise<Set<string>>}
     */
    WhitelistCache.prototype.getOrLoad = function (key, loaderContext) {
        var self = this;

        // Return cached data if valid
        var cached = this.get(key);
        if (cached) {
            return Promise.resolve(cached);
        }

        // If already loading, return the existing promise
        if (this._loadingPromises[key]) {
            return this._loadingPromises[key];
        }

        // Check if loader exists
        var loader = this._loaders[key];
        if (!loader) {
            return Promise.reject(new Error("No loader registered for cache key: " + key));
        }

        // Start loading
        this._loadingPromises[key] = loader(loaderContext)
            .then(function (data) {
                self.set(key, data);
                delete self._loadingPromises[key];
                return self.get(key);
            })
            .catch(function (error) {
                delete self._loadingPromises[key];
                throw error;
            });

        return this._loadingPromises[key];
    };

    /**
     * Check if a value exists in a cached whitelist
     * @param {string} key - Cache key
     * @param {string} value - Value to check
     * @returns {boolean|null} - null if cache not available
     */
    WhitelistCache.prototype.contains = function (key, value) {
        var cached = this.get(key);
        if (!cached) {
            return null;
        }
        return cached.has(value);
    };

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    WhitelistCache.prototype.getStats = function () {
        var self = this;
        var keys = Object.keys(this._cache);
        var valid = 0;
        var expired = 0;

        keys.forEach(function (key) {
            if (self._isExpired(self._cache[key])) {
                expired++;
            } else {
                valid++;
            }
        });

        return {
            totalEntries: keys.length,
            validEntries: valid,
            expiredEntries: expired,
            registeredLoaders: Object.keys(this._loaders).length,
            pendingLoads: Object.keys(this._loadingPromises).length
        };
    };

    /**
     * Get remaining TTL for a cache entry
     * @param {string} key - Cache key
     * @returns {number|null} - Remaining TTL in milliseconds, null if not cached
     */
    WhitelistCache.prototype.getRemainingTTL = function (key) {
        var entry = this._cache[key];
        if (!entry) {
            return null;
        }
        var remaining = entry.ttl - (Date.now() - entry.timestamp);
        return remaining > 0 ? remaining : 0;
    };

    /**
     * Refresh a cache entry (reload from loader)
     * @param {string} key - Cache key
     * @param {*} [loaderContext] - Optional context to pass to loader
     * @returns {Promise<Set<string>>}
     */
    WhitelistCache.prototype.refresh = function (key, loaderContext) {
        this.remove(key);
        return this.getOrLoad(key, loaderContext);
    };

    /**
     * Serialize cache to JSON (for persistence)
     * @returns {Object}
     */
    WhitelistCache.prototype.toJSON = function () {
        var self = this;
        var serialized = {};

        Object.keys(this._cache).forEach(function (key) {
            var entry = self._cache[key];
            serialized[key] = {
                data: Array.from(entry.data),
                timestamp: entry.timestamp,
                ttl: entry.ttl
            };
        });

        return serialized;
    };

    /**
     * Restore cache from JSON (for persistence)
     * @param {Object} json - Serialized cache data
     */
    WhitelistCache.prototype.fromJSON = function (json) {
        var self = this;

        Object.keys(json).forEach(function (key) {
            var entry = json[key];
            self._cache[key] = {
                data: new Set(entry.data),
                timestamp: entry.timestamp,
                ttl: entry.ttl
            };
        });
    };

    // =========================================================================
    // Singleton instance with pre-configured loaders
    // =========================================================================

    /**
     * Global cache instance
     * @type {WhitelistCache}
     */
    var globalCache = null;

    /**
     * Get or create the global cache instance
     * @returns {WhitelistCache}
     */
    function getGlobalCache() {
        if (!globalCache) {
            globalCache = new WhitelistCache();
            _registerDefaultLoaders(globalCache);
        }
        return globalCache;
    }

    /**
     * Register default loaders for the global cache
     * @private
     * @param {WhitelistCache} cache
     */
    function _registerDefaultLoaders(cache) {
        // EN 13556 static loader (timber codes)
        cache.registerLoader(FieldTypes.WhitelistSource.EN13556, function () {
            return Promise.resolve(FieldTypes.EN13556_SAMPLE_CODES);
        });

        // Procurement type static loader
        cache.registerLoader("PROCUREMENT_TYPES", function () {
            return Promise.resolve(FieldTypes.PROCUREMENT_TYPE_VALUES);
        });
    }

    // =========================================================================

    return {
        WhitelistCache: WhitelistCache,
        getGlobalCache: getGlobalCache,
        DEFAULT_TTL_MS: DEFAULT_TTL_MS
    };
});
