/**
 * Unit tests for FieldModels.js
 *
 * Tests FieldDef, ValidationIssue, and FieldResult classes.
 */
sap.ui.define([
    "capgeminiappws2025/utils/nonstandard/FieldModels",
    "capgeminiappws2025/utils/nonstandard/FieldTypes"
], function (FieldModels, FieldTypes) {
    "use strict";

    var FieldDef = FieldModels.FieldDef;
    var ValidationIssue = FieldModels.ValidationIssue;
    var FieldResult = FieldModels.FieldResult;

    // =========================================================================

    QUnit.module("FieldModels - FieldDef");

    QUnit.test("FieldDef - constructor with minimal config", function (assert) {
        var def = new FieldDef({
            key: "MEINS",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT
        });

        assert.strictEqual(def.key, "MEINS", "Key is set");
        assert.strictEqual(def.fieldTypeCategory, FieldTypes.FieldTypeCategory.UNIT, "Category is set");
        assert.strictEqual(def.sapField, "MEINS", "sapField defaults to key");
        assert.strictEqual(def.mandatory, false, "mandatory defaults to false");
        assert.deepEqual(def.dependencies, [], "dependencies defaults to empty array");
    });

    QUnit.test("FieldDef - constructor with full config", function (assert) {
        var def = new FieldDef({
            key: "MENGE",
            sapTable: "VBAP",
            sapField: "KWMENG",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.QUAN,
            typicalType: "QUAN",
            dependencies: ["MEINS"],
            whitelistSource: null,
            mandatory: true,
            description: "Order quantity"
        });

        assert.strictEqual(def.key, "MENGE", "Key is set");
        assert.strictEqual(def.sapTable, "VBAP", "sapTable is set");
        assert.strictEqual(def.sapField, "KWMENG", "sapField is set");
        assert.strictEqual(def.mandatory, true, "mandatory is set");
        assert.deepEqual(def.dependencies, ["MEINS"], "dependencies is set");
    });

    QUnit.test("FieldDef - throws error without key", function (assert) {
        assert.throws(function () {
            new FieldDef({ fieldTypeCategory: "UNIT" });
        }, /requires.*key/, "Throws error for missing key");
    });

    QUnit.test("FieldDef - throws error without fieldTypeCategory", function (assert) {
        assert.throws(function () {
            new FieldDef({ key: "TEST" });
        }, /requires.*fieldTypeCategory/, "Throws error for missing fieldTypeCategory");
    });

    QUnit.test("FieldDef - hasDependencies", function (assert) {
        var defWithDeps = new FieldDef({
            key: "MENGE",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.QUAN,
            dependencies: ["MEINS"]
        });

        var defWithoutDeps = new FieldDef({
            key: "MEINS",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT
        });

        assert.strictEqual(defWithDeps.hasDependencies(), true, "Has dependencies");
        assert.strictEqual(defWithoutDeps.hasDependencies(), false, "No dependencies");
    });

    QUnit.test("FieldDef - getPrimaryDependency", function (assert) {
        var defWithDeps = new FieldDef({
            key: "MENGE",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.QUAN,
            dependencies: ["MEINS", "SECONDARY"]
        });

        var defWithoutDeps = new FieldDef({
            key: "MEINS",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT
        });

        assert.strictEqual(defWithDeps.getPrimaryDependency(), "MEINS", "Returns first dependency");
        assert.strictEqual(defWithoutDeps.getPrimaryDependency(), null, "Returns null without dependencies");
    });

    QUnit.test("FieldDef - clone", function (assert) {
        var original = new FieldDef({
            key: "MEINS",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT,
            mandatory: false
        });

        var clone = original.clone({ mandatory: true });

        assert.strictEqual(clone.key, "MEINS", "Key preserved");
        assert.strictEqual(clone.mandatory, true, "Overridden property applied");
        assert.strictEqual(original.mandatory, false, "Original unchanged");
        assert.notStrictEqual(clone, original, "Different instances");
    });

    QUnit.test("FieldDef - toJSON", function (assert) {
        var def = new FieldDef({
            key: "MEINS",
            fieldTypeCategory: FieldTypes.FieldTypeCategory.UNIT,
            description: "Unit"
        });

        var json = def.toJSON();

        assert.strictEqual(json.key, "MEINS", "Key in JSON");
        assert.strictEqual(json.fieldTypeCategory, "UNIT", "Category in JSON");
        assert.strictEqual(json.description, "Unit", "Description in JSON");
    });

    // =========================================================================

    QUnit.module("FieldModels - ValidationIssue");

    QUnit.test("ValidationIssue - constructor", function (assert) {
        var issue = new ValidationIssue({
            severity: FieldTypes.Severity.ERROR,
            message: "Test error",
            hint: "Fix it"
        });

        assert.strictEqual(issue.severity, FieldTypes.Severity.ERROR, "Severity set");
        assert.strictEqual(issue.message, "Test error", "Message set");
        assert.strictEqual(issue.hint, "Fix it", "Hint set");
    });

    QUnit.test("ValidationIssue - throws without required fields", function (assert) {
        assert.throws(function () {
            new ValidationIssue({ message: "Test" });
        }, /requires.*severity/, "Throws without severity");

        assert.throws(function () {
            new ValidationIssue({ severity: "ERROR" });
        }, /requires.*message/, "Throws without message");
    });

    QUnit.test("ValidationIssue - isError", function (assert) {
        var error = new ValidationIssue({
            severity: FieldTypes.Severity.ERROR,
            message: "Error"
        });

        var warning = new ValidationIssue({
            severity: FieldTypes.Severity.WARN,
            message: "Warning"
        });

        assert.strictEqual(error.isError(), true, "Error is error");
        assert.strictEqual(warning.isError(), false, "Warning is not error");
    });

    QUnit.test("ValidationIssue - isWarning", function (assert) {
        var error = new ValidationIssue({
            severity: FieldTypes.Severity.ERROR,
            message: "Error"
        });

        var warning = new ValidationIssue({
            severity: FieldTypes.Severity.WARN,
            message: "Warning"
        });

        assert.strictEqual(error.isWarning(), false, "Error is not warning");
        assert.strictEqual(warning.isWarning(), true, "Warning is warning");
    });

    QUnit.test("ValidationIssue - toString", function (assert) {
        var issue = new ValidationIssue({
            severity: FieldTypes.Severity.ERROR,
            message: "Test error",
            hint: "Fix it"
        });

        var str = issue.toString();

        assert.ok(str.indexOf("[ERROR]") !== -1, "Contains severity");
        assert.ok(str.indexOf("Test error") !== -1, "Contains message");
        assert.ok(str.indexOf("Fix it") !== -1, "Contains hint");
    });

    QUnit.test("ValidationIssue - static error()", function (assert) {
        var issue = ValidationIssue.error("Error message", "Hint");

        assert.strictEqual(issue.severity, FieldTypes.Severity.ERROR, "Severity is ERROR");
        assert.strictEqual(issue.message, "Error message", "Message set");
        assert.strictEqual(issue.hint, "Hint", "Hint set");
    });

    QUnit.test("ValidationIssue - static warn()", function (assert) {
        var issue = ValidationIssue.warn("Warning message");

        assert.strictEqual(issue.severity, FieldTypes.Severity.WARN, "Severity is WARN");
        assert.strictEqual(issue.message, "Warning message", "Message set");
    });

    QUnit.test("ValidationIssue - static info()", function (assert) {
        var issue = ValidationIssue.info("Info message");

        assert.strictEqual(issue.severity, FieldTypes.Severity.INFO, "Severity is INFO");
        assert.strictEqual(issue.message, "Info message", "Message set");
    });

    // =========================================================================

    QUnit.module("FieldModels - FieldResult");

    QUnit.test("FieldResult - constructor", function (assert) {
        var result = new FieldResult({
            key: "MEINS",
            rawValue: "kg",
            normalizedValue: "KG",
            ok: true
        });

        assert.strictEqual(result.key, "MEINS", "Key set");
        assert.strictEqual(result.rawValue, "kg", "Raw value set");
        assert.strictEqual(result.normalizedValue, "KG", "Normalized value set");
        assert.strictEqual(result.ok, true, "OK set");
        assert.deepEqual(result.issues, [], "Issues defaults to empty");
    });

    QUnit.test("FieldResult - throws without key", function (assert) {
        assert.throws(function () {
            new FieldResult({ rawValue: "test" });
        }, /requires.*key/, "Throws without key");
    });

    QUnit.test("FieldResult - addIssue", function (assert) {
        var result = new FieldResult({
            key: "TEST",
            rawValue: "test",
            ok: true
        });

        var issue = ValidationIssue.error("Error");
        result.addIssue(issue);

        assert.strictEqual(result.issues.length, 1, "Issue added");
        assert.strictEqual(result.ok, false, "OK set to false on error");
    });

    QUnit.test("FieldResult - addError", function (assert) {
        var result = new FieldResult({
            key: "TEST",
            rawValue: "test",
            ok: true
        });

        result.addError("Error message", "Hint");

        assert.strictEqual(result.issues.length, 1, "Issue added");
        assert.strictEqual(result.issues[0].severity, FieldTypes.Severity.ERROR, "Is error");
        assert.strictEqual(result.ok, false, "OK set to false");
    });

    QUnit.test("FieldResult - addWarning", function (assert) {
        var result = new FieldResult({
            key: "TEST",
            rawValue: "test",
            ok: true
        });

        result.addWarning("Warning message");

        assert.strictEqual(result.issues.length, 1, "Issue added");
        assert.strictEqual(result.issues[0].severity, FieldTypes.Severity.WARN, "Is warning");
        assert.strictEqual(result.ok, true, "OK remains true for warnings");
    });

    QUnit.test("FieldResult - hasErrors", function (assert) {
        var result = new FieldResult({ key: "TEST", ok: true });

        assert.strictEqual(result.hasErrors(), false, "No errors initially");

        result.addError("Error");

        assert.strictEqual(result.hasErrors(), true, "Has errors after addError");
    });

    QUnit.test("FieldResult - hasWarnings", function (assert) {
        var result = new FieldResult({ key: "TEST", ok: true });

        assert.strictEqual(result.hasWarnings(), false, "No warnings initially");

        result.addWarning("Warning");

        assert.strictEqual(result.hasWarnings(), true, "Has warnings after addWarning");
    });

    QUnit.test("FieldResult - getErrors", function (assert) {
        var result = new FieldResult({ key: "TEST", ok: true });
        result.addError("Error 1");
        result.addWarning("Warning 1");
        result.addError("Error 2");

        var errors = result.getErrors();

        assert.strictEqual(errors.length, 2, "Returns only errors");
        assert.strictEqual(errors[0].message, "Error 1", "First error");
        assert.strictEqual(errors[1].message, "Error 2", "Second error");
    });

    QUnit.test("FieldResult - getWarnings", function (assert) {
        var result = new FieldResult({ key: "TEST", ok: true });
        result.addError("Error 1");
        result.addWarning("Warning 1");
        result.addWarning("Warning 2");

        var warnings = result.getWarnings();

        assert.strictEqual(warnings.length, 2, "Returns only warnings");
    });

    QUnit.test("FieldResult - static success()", function (assert) {
        var result = FieldResult.success("MEINS", "kg", "KG");

        assert.strictEqual(result.key, "MEINS", "Key set");
        assert.strictEqual(result.rawValue, "kg", "Raw value set");
        assert.strictEqual(result.normalizedValue, "KG", "Normalized value set");
        assert.strictEqual(result.ok, true, "OK is true");
        assert.strictEqual(result.issues.length, 0, "No issues");
    });

    QUnit.test("FieldResult - static failure()", function (assert) {
        var result = FieldResult.failure("MEINS", "invalid", "Error message", "Hint");

        assert.strictEqual(result.key, "MEINS", "Key set");
        assert.strictEqual(result.rawValue, "invalid", "Raw value set");
        assert.strictEqual(result.normalizedValue, null, "Normalized value is null");
        assert.strictEqual(result.ok, false, "OK is false");
        assert.strictEqual(result.issues.length, 1, "Has one issue");
        assert.strictEqual(result.issues[0].message, "Error message", "Error message set");
    });

    QUnit.test("FieldResult - static skipped()", function (assert) {
        var result = FieldResult.skipped("MEINS", null);

        assert.strictEqual(result.key, "MEINS", "Key set");
        assert.strictEqual(result.ok, true, "OK is true");
        assert.strictEqual(result.issues.length, 1, "Has info issue");
    });

    QUnit.test("FieldResult - toJSON", function (assert) {
        var result = FieldResult.success("MEINS", "kg", "KG");
        result.addWarning("Test warning");

        var json = result.toJSON();

        assert.strictEqual(json.key, "MEINS", "Key in JSON");
        assert.strictEqual(json.rawValue, "kg", "Raw value in JSON");
        assert.strictEqual(json.normalizedValue, "KG", "Normalized value in JSON");
        assert.strictEqual(json.ok, true, "OK in JSON");
        assert.strictEqual(json.issues.length, 1, "Issues in JSON");
    });

    QUnit.test("FieldResult - toString", function (assert) {
        var result = FieldResult.success("MEINS", "kg", "KG");

        var str = result.toString();

        assert.ok(str.indexOf("MEINS") !== -1, "Contains key");
        assert.ok(str.indexOf("OK") !== -1, "Contains status");
    });
});
