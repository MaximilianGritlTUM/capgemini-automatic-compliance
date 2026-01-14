/**
 * Unit tests for FieldProcessor.js
 *
 * Tests the main field processing functionality.
 */
sap.ui.define([
    "capgeminiappws2025/utils/nonstandard/FieldProcessor",
    "capgeminiappws2025/utils/nonstandard/FieldTypes"
], function (FieldProcessor, FieldTypes) {
    "use strict";

    var Processor = FieldProcessor.FieldProcessor;
    var FieldDef = FieldProcessor.FieldDef;

    // =========================================================================

    QUnit.module("FieldProcessor - Initialization");

    QUnit.test("create - creates processor instance", function (assert) {
        var processor = Processor.createOffline();

        assert.ok(processor instanceof Processor, "Instance created");
        assert.ok(processor.getCache(), "Has cache");
        assert.ok(processor.getLoader(), "Has loader");
    });

    QUnit.test("registerFieldDef - registers field definition", function (assert) {
        var processor = Processor.createOffline();

        processor.registerFieldDef(new FieldDef({
            key: "CUSTOM_FIELD",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT
        }));

        var def = processor.getFieldDef("CUSTOM_FIELD");
        assert.ok(def, "Field definition registered");
        assert.strictEqual(def.key, "CUSTOM_FIELD", "Correct key");
    });

    QUnit.test("getFieldDefs - returns all definitions", function (assert) {
        var processor = Processor.createOffline();

        var defs = processor.getFieldDefs();

        assert.ok(Object.keys(defs).length > 0, "Has default definitions");
        assert.ok(defs.MEINS, "Has MEINS");
        assert.ok(defs.WAERS, "Has WAERS");
    });

    QUnit.test("registerWhitelist - registers custom whitelist", function (assert) {
        var processor = Processor.createOffline();

        processor.registerWhitelist("CUSTOM", new Set(["A", "B", "C"]));

        var cached = processor.getCache().get("CUSTOM");
        assert.ok(cached, "Whitelist cached");
        assert.strictEqual(cached.has("A"), true, "Contains values");
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Field Validation");

    QUnit.test("validateValue - unit field", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("MEINS", "kg").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "KG", "Normalized to uppercase");
            done();
        });
    });

    QUnit.test("validateValue - currency field", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("WAERS", "eur").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "EUR", "Normalized to uppercase");
            done();
        });
    });

    QUnit.test("validateValue - date field", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("ERDAT", "20231215").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "2023-12-15", "Normalized to ISO");
            done();
        });
    });

    QUnit.test("validateValue - invalid date", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("ERDAT", "invalid-date").then(function (result) {
            assert.strictEqual(result.ok, false, "Validation failed");
            assert.strictEqual(result.hasErrors(), true, "Has errors");
            done();
        });
    });

    QUnit.test("validateValue - boolean field", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("LOEKZ", "true").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "X", "Normalized to X");
            done();
        });
    });

    QUnit.test("validateValue - procurement type", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("BESKZ", "e").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "E", "Normalized to uppercase");
            done();
        });
    });

    QUnit.test("validateValue - unknown field", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("UNKNOWN_FIELD", "value").then(function (result) {
            assert.strictEqual(result.ok, false, "Validation failed");
            assert.ok(result.hasErrors(), "Has error about unknown field");
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Record Processing");

    QUnit.test("processRecord - validates multiple fields", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        var record = {
            MEINS: "kg",
            WAERS: "eur",
            ERDAT: "20231215"
        };

        processor.processRecord(record).then(function (results) {
            assert.strictEqual(results.length, 3, "Three results");

            var meinsResult = results.find(function (r) { return r.key === "MEINS"; });
            var waersResult = results.find(function (r) { return r.key === "WAERS"; });
            var erdatResult = results.find(function (r) { return r.key === "ERDAT"; });

            assert.strictEqual(meinsResult.ok, true, "MEINS valid");
            assert.strictEqual(waersResult.ok, true, "WAERS valid");
            assert.strictEqual(erdatResult.ok, true, "ERDAT valid");
            done();
        });
    });

    QUnit.test("processRecord - with specific fields", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        var record = {
            MEINS: "kg",
            WAERS: "eur",
            ERDAT: "20231215"
        };

        processor.processRecord(record, ["MEINS", "WAERS"]).then(function (results) {
            assert.strictEqual(results.length, 2, "Two results (ERDAT excluded)");
            done();
        });
    });

    QUnit.test("processRecord - checks dependencies", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        // MENGE requires MEINS
        var record = {
            MENGE: "100",
            MEINS: "KG"
        };

        processor.processRecord(record).then(function (results) {
            var mengeResult = results.find(function (r) { return r.key === "MENGE"; });

            assert.strictEqual(mengeResult.ok, true, "MENGE valid with dependency");
            done();
        });
    });

    QUnit.test("processRecord - missing dependency triggers warning", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        // MENGE without MEINS
        var record = {
            MENGE: "100"
        };

        processor.processRecord(record).then(function (results) {
            var mengeResult = results.find(function (r) { return r.key === "MENGE"; });

            // Should have warning about missing dependency
            assert.ok(
                mengeResult.hasWarnings() || mengeResult.hasErrors(),
                "Has warning/error about missing dependency"
            );
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Normalized Record");

    QUnit.test("createNormalizedRecord - creates record with normalized values", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        var record = {
            MEINS: "kg",
            WAERS: "eur",
            EXTRA: "untouched"
        };

        processor.processRecord(record).then(function (results) {
            var normalized = processor.createNormalizedRecord(results, record);

            assert.strictEqual(normalized.MEINS, "KG", "MEINS normalized");
            assert.strictEqual(normalized.WAERS, "EUR", "WAERS normalized");
            assert.strictEqual(normalized.EXTRA, "untouched", "EXTRA preserved");
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Summary");

    QUnit.test("getSummary - returns validation summary", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        var record = {
            MEINS: "kg",
            ERDAT: "invalid-date",
            BESKZ: ""
        };

        processor.processRecord(record).then(function (results) {
            var summary = processor.getSummary(results);

            assert.strictEqual(summary.total, 3, "Total count");
            assert.ok(summary.valid >= 1, "At least one valid");
            assert.ok(summary.invalid >= 1, "At least one invalid");
            assert.ok(summary.errors.length > 0, "Has errors");
            assert.strictEqual(summary.isValid, false, "Overall not valid");
            done();
        });
    });

    QUnit.test("getSummary - valid record", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        var record = {
            MEINS: "kg",
            WAERS: "eur"
        };

        processor.processRecord(record).then(function (results) {
            var summary = processor.getSummary(results);

            assert.strictEqual(summary.invalid, 0, "No invalid");
            assert.strictEqual(summary.isValid, true, "Overall valid");
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Quantity and Amount");

    QUnit.test("validateValue - quantity with European format", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("MENGE", "1.234,56").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "1234.56", "Normalized correctly");
            done();
        });
    });

    QUnit.test("validateValue - amount/currency", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("NETWR", "999.99").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.strictEqual(result.normalizedValue, "999.99", "Normalized correctly");
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Timber Codes");

    QUnit.test("validateValue - valid timber codes", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("TIMBER_CODES", "ABAL,FASY").then(function (result) {
            assert.strictEqual(result.ok, true, "Validation passed");
            assert.deepEqual(result.normalizedValue, ["ABAL", "FASY"], "Normalized array");
            done();
        });
    });

    QUnit.test("validateValue - invalid timber code format", function (assert) {
        var done = assert.async();
        var processor = Processor.createOffline();

        processor.validateValue("TIMBER_CODES", "ABAL,AB,ABCDE").then(function (result) {
            assert.strictEqual(result.ok, false, "Validation failed");
            assert.strictEqual(result.hasErrors(), true, "Has errors for invalid format");
            done();
        });
    });

    // =========================================================================

    QUnit.module("FieldProcessor - Exports");

    QUnit.test("module exports all components", function (assert) {
        assert.ok(FieldProcessor.FieldProcessor, "FieldProcessor class");
        assert.ok(FieldProcessor.FieldDef, "FieldDef class");
        assert.ok(FieldProcessor.FieldResult, "FieldResult class");
        assert.ok(FieldProcessor.ValidationIssue, "ValidationIssue class");
        assert.ok(FieldProcessor.FieldTypeCategory, "FieldTypeCategory enum");
        assert.ok(FieldProcessor.Severity, "Severity enum");
        assert.ok(FieldProcessor.WhitelistSource, "WhitelistSource enum");
        assert.ok(FieldProcessor.Normalizers, "Normalizers module");
        assert.ok(FieldProcessor.Validators, "Validators module");
    });
});
