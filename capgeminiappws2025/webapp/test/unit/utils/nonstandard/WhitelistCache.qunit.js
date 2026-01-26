/**
 * Unit tests for WhitelistCache.js
 *
 * Tests caching functionality with TTL.
 */
sap.ui.define([
    "capgeminiappws2025/utils/nonstandard/WhitelistCache"
], function (WhitelistCache) {
    "use strict";

    var Cache = WhitelistCache.WhitelistCache;

    // =========================================================================

    QUnit.module("WhitelistCache - Basic Operations");

    QUnit.test("set and get - basic functionality", function (assert) {
        var cache = new Cache();

        cache.set("TEST", new Set(["A", "B", "C"]));

        var result = cache.get("TEST");
        assert.ok(result instanceof Set, "Returns a Set");
        assert.strictEqual(result.size, 3, "Set has correct size");
        assert.strictEqual(result.has("A"), true, "Contains A");
        assert.strictEqual(result.has("B"), true, "Contains B");
        assert.strictEqual(result.has("C"), true, "Contains C");
    });

    QUnit.test("set with array - converts to Set", function (assert) {
        var cache = new Cache();

        cache.set("TEST", ["A", "B", "C"]);

        var result = cache.get("TEST");
        assert.ok(result instanceof Set, "Array converted to Set");
        assert.strictEqual(result.size, 3, "Set has correct size");
    });

    QUnit.test("get - returns null for missing key", function (assert) {
        var cache = new Cache();

        var result = cache.get("NONEXISTENT");
        assert.strictEqual(result, null, "Returns null for missing key");
    });

    QUnit.test("has - checks existence", function (assert) {
        var cache = new Cache();

        cache.set("TEST", ["A"]);

        assert.strictEqual(cache.has("TEST"), true, "Has returns true for existing");
        assert.strictEqual(cache.has("NONEXISTENT"), false, "Has returns false for missing");
    });

    QUnit.test("remove - removes entry", function (assert) {
        var cache = new Cache();

        cache.set("TEST", ["A"]);
        assert.strictEqual(cache.has("TEST"), true, "Entry exists");

        cache.remove("TEST");
        assert.strictEqual(cache.has("TEST"), false, "Entry removed");
    });

    QUnit.test("clear - removes all entries", function (assert) {
        var cache = new Cache();

        cache.set("TEST1", ["A"]);
        cache.set("TEST2", ["B"]);

        cache.clear();

        assert.strictEqual(cache.has("TEST1"), false, "TEST1 removed");
        assert.strictEqual(cache.has("TEST2"), false, "TEST2 removed");
    });

    // =========================================================================

    QUnit.module("WhitelistCache - TTL");

    QUnit.test("get - returns null for expired entry", function (assert) {
        var cache = new Cache();

        // Set with very short TTL
        cache.set("TEST", ["A"], 1); // 1ms TTL

        // Wait for expiration
        var done = assert.async();
        setTimeout(function () {
            var result = cache.get("TEST");
            assert.strictEqual(result, null, "Expired entry returns null");
            done();
        }, 10);
    });

    QUnit.test("has - returns false for expired entry", function (assert) {
        var cache = new Cache();

        cache.set("TEST", ["A"], 1); // 1ms TTL

        var done = assert.async();
        setTimeout(function () {
            assert.strictEqual(cache.has("TEST"), false, "Expired entry returns false");
            done();
        }, 10);
    });

    QUnit.test("getRemainingTTL - returns remaining time", function (assert) {
        var cache = new Cache();

        cache.set("TEST", ["A"], 10000); // 10 second TTL

        var remaining = cache.getRemainingTTL("TEST");
        assert.ok(remaining > 0, "Has remaining TTL");
        assert.ok(remaining <= 10000, "TTL within expected range");
    });

    QUnit.test("getRemainingTTL - returns null for missing key", function (assert) {
        var cache = new Cache();

        var remaining = cache.getRemainingTTL("NONEXISTENT");
        assert.strictEqual(remaining, null, "Returns null for missing key");
    });

    QUnit.test("clearExpired - removes only expired entries", function (assert) {
        var cache = new Cache();

        cache.set("FRESH", ["A"], 10000); // 10 second TTL
        cache.set("EXPIRED", ["B"], 1);   // 1ms TTL

        var done = assert.async();
        setTimeout(function () {
            var count = cache.clearExpired();

            assert.strictEqual(count, 1, "One entry cleared");
            assert.strictEqual(cache.has("FRESH"), true, "Fresh entry still exists");
            assert.strictEqual(cache.has("EXPIRED"), false, "Expired entry removed");
            done();
        }, 10);
    });

    // =========================================================================

    QUnit.module("WhitelistCache - Loaders");

    QUnit.test("registerLoader and getOrLoad - loads data", function (assert) {
        var cache = new Cache();
        var loadCalled = false;

        cache.registerLoader("TEST", function () {
            loadCalled = true;
            return Promise.resolve(new Set(["A", "B"]));
        });

        var done = assert.async();
        cache.getOrLoad("TEST").then(function (result) {
            assert.strictEqual(loadCalled, true, "Loader was called");
            assert.ok(result instanceof Set, "Returns a Set");
            assert.strictEqual(result.size, 2, "Set has correct size");
            done();
        });
    });

    QUnit.test("getOrLoad - uses cache if available", function (assert) {
        var cache = new Cache();
        var loadCount = 0;

        cache.registerLoader("TEST", function () {
            loadCount++;
            return Promise.resolve(new Set(["A"]));
        });

        var done = assert.async();

        // First load
        cache.getOrLoad("TEST").then(function () {
            assert.strictEqual(loadCount, 1, "First load called loader");

            // Second load should use cache
            return cache.getOrLoad("TEST");
        }).then(function () {
            assert.strictEqual(loadCount, 1, "Second load used cache");
            done();
        });
    });

    QUnit.test("getOrLoad - rejects for missing loader", function (assert) {
        var cache = new Cache();

        var done = assert.async();
        cache.getOrLoad("UNKNOWN").catch(function (error) {
            assert.ok(error.message.indexOf("No loader") !== -1, "Error mentions missing loader");
            done();
        });
    });

    QUnit.test("getOrLoad - deduplicates concurrent requests", function (assert) {
        var cache = new Cache();
        var loadCount = 0;

        cache.registerLoader("TEST", function () {
            loadCount++;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(new Set(["A"]));
                }, 50);
            });
        });

        var done = assert.async();

        // Start two concurrent loads
        var p1 = cache.getOrLoad("TEST");
        var p2 = cache.getOrLoad("TEST");

        Promise.all([p1, p2]).then(function () {
            assert.strictEqual(loadCount, 1, "Only one load executed");
            done();
        });
    });

    QUnit.test("refresh - reloads data", function (assert) {
        var cache = new Cache();
        var loadCount = 0;

        cache.registerLoader("TEST", function () {
            loadCount++;
            return Promise.resolve(new Set(["A"]));
        });

        var done = assert.async();

        cache.getOrLoad("TEST").then(function () {
            assert.strictEqual(loadCount, 1, "First load");

            return cache.refresh("TEST");
        }).then(function () {
            assert.strictEqual(loadCount, 2, "Refresh triggered reload");
            done();
        });
    });

    // =========================================================================

    QUnit.module("WhitelistCache - Utility");

    QUnit.test("contains - checks value in cache", function (assert) {
        var cache = new Cache();

        cache.set("TEST", new Set(["A", "B", "C"]));

        assert.strictEqual(cache.contains("TEST", "A"), true, "Contains A");
        assert.strictEqual(cache.contains("TEST", "Z"), false, "Does not contain Z");
        assert.strictEqual(cache.contains("MISSING", "A"), null, "Returns null for missing cache");
    });

    QUnit.test("getStats - returns cache statistics", function (assert) {
        var cache = new Cache();

        cache.set("TEST1", ["A"]);
        cache.set("TEST2", ["B"], 1); // Short TTL

        cache.registerLoader("LOADER1", function () { return Promise.resolve([]); });

        var done = assert.async();
        setTimeout(function () {
            var stats = cache.getStats();

            assert.strictEqual(stats.totalEntries, 2, "Total entries");
            assert.strictEqual(stats.validEntries, 1, "Valid entries");
            assert.strictEqual(stats.expiredEntries, 1, "Expired entries");
            assert.strictEqual(stats.registeredLoaders, 1, "Registered loaders");
            done();
        }, 10);
    });

    QUnit.test("toJSON and fromJSON - serialization", function (assert) {
        var cache1 = new Cache();

        cache1.set("TEST1", new Set(["A", "B"]));
        cache1.set("TEST2", new Set(["C", "D"]));

        var json = cache1.toJSON();

        var cache2 = new Cache();
        cache2.fromJSON(json);

        assert.strictEqual(cache2.has("TEST1"), true, "TEST1 restored");
        assert.strictEqual(cache2.has("TEST2"), true, "TEST2 restored");
        assert.strictEqual(cache2.get("TEST1").has("A"), true, "Data restored correctly");
    });

    // =========================================================================

    QUnit.module("WhitelistCache - Global Instance");

    QUnit.test("getGlobalCache - returns singleton", function (assert) {
        var cache1 = WhitelistCache.getGlobalCache();
        var cache2 = WhitelistCache.getGlobalCache();

        assert.strictEqual(cache1, cache2, "Same instance returned");
    });

    QUnit.test("getGlobalCache - has default loaders", function (assert) {
        var cache = WhitelistCache.getGlobalCache();

        var done = assert.async();

        // EN13556 should be pre-registered
        cache.getOrLoad("EN13556").then(function (result) {
            assert.ok(result instanceof Set, "EN13556 loader works");
            assert.ok(result.size > 0, "Has codes loaded");
            done();
        });
    });
});
