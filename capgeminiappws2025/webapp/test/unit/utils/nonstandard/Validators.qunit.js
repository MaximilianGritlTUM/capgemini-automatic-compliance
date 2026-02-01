/**
 * Unit tests for Validators.js
 *
 * Tests validation functions for all field types.
 */
sap.ui.define([
    "capgeminiappws2025/utils/nonstandard/Validators",
    "capgeminiappws2025/utils/nonstandard/FieldTypes",
    "capgeminiappws2025/utils/nonstandard/FieldModels"
], function (Validators, FieldTypes, FieldModels) {
    "use strict";

    var FieldResult = FieldModels.FieldResult;

    // =========================================================================

    QUnit.module("Validators - Unit");

    QUnit.test("validateUnit - valid unit", function (assert) {
        var whitelist = new Set(["KG", "G", "L", "ML"]);
        var result = Validators.validateUnit("MEINS", "kg", whitelist);

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "KG", "Normalized to uppercase");
        assert.strictEqual(result.issues.length, 0, "No issues");
    });

    QUnit.test("validateUnit - invalid unit", function (assert) {
        var whitelist = new Set(["KG", "G", "L", "ML"]);
        var result = Validators.validateUnit("MEINS", "INVALID", whitelist);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("validateUnit - empty value", function (assert) {
        var whitelist = new Set(["KG", "G"]);
        var result = Validators.validateUnit("MEINS", "", whitelist);

        assert.strictEqual(result.ok, true, "Empty value is valid (optional)");
    });

    QUnit.test("validateUnit - missing whitelist", function (assert) {
        var result = Validators.validateUnit("MEINS", "KG", null);

        assert.strictEqual(result.ok, true, "Validation passes without whitelist");
        assert.strictEqual(result.hasWarnings(), true, "Has warning about missing whitelist");
    });

    // =========================================================================

    QUnit.module("Validators - Currency");

    QUnit.test("validateCurrency - valid currency", function (assert) {
        var whitelist = new Set(["EUR", "USD", "GBP"]);
        var result = Validators.validateCurrency("WAERS", "eur", whitelist);

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "EUR", "Normalized to uppercase");
    });

    QUnit.test("validateCurrency - invalid currency", function (assert) {
        var whitelist = new Set(["EUR", "USD", "GBP"]);
        var result = Validators.validateCurrency("WAERS", "XXX", whitelist);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("validateCurrency - empty value", function (assert) {
        var whitelist = new Set(["EUR", "USD"]);
        var result = Validators.validateCurrency("WAERS", null, whitelist);

        assert.strictEqual(result.ok, true, "Null value is valid (optional)");
    });

    // =========================================================================

    QUnit.module("Validators - Procurement Type");

    QUnit.test("validateProcurementType - valid values", function (assert) {
        var resultE = Validators.validateProcurementType("BESKZ", "E");
        assert.strictEqual(resultE.ok, true, "E is valid");
        assert.strictEqual(resultE.normalizedValue, "E", "Normalized E");

        var resultF = Validators.validateProcurementType("BESKZ", "f");
        assert.strictEqual(resultF.ok, true, "f is valid");
        assert.strictEqual(resultF.normalizedValue, "F", "Normalized F");

        var resultX = Validators.validateProcurementType("BESKZ", "X");
        assert.strictEqual(resultX.ok, true, "X is valid");

        var resultBlank = Validators.validateProcurementType("BESKZ", "");
        assert.strictEqual(resultBlank.ok, true, "Blank is valid");
    });

    QUnit.test("validateProcurementType - invalid value", function (assert) {
        var result = Validators.validateProcurementType("BESKZ", "Z");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    // =========================================================================

    QUnit.module("Validators - Boolean");

    QUnit.test("validateBoolean - truthy values", function (assert) {
        var values = ["X", "x", "true", "1", "yes", "Y"];
        values.forEach(function (val) {
            var result = Validators.validateBoolean("LOEKZ", val);
            assert.strictEqual(result.ok, true, val + " is valid");
            assert.strictEqual(result.normalizedValue, "X", val + " normalizes to X");
        });
    });

    QUnit.test("validateBoolean - falsy values", function (assert) {
        var values = ["", " ", "false", "0", "no", "N"];
        values.forEach(function (val) {
            var result = Validators.validateBoolean("LOEKZ", val);
            assert.strictEqual(result.ok, true, "'" + val + "' is valid");
            assert.strictEqual(result.normalizedValue, "", "'" + val + "' normalizes to empty");
        });
    });

    QUnit.test("validateBoolean - invalid value", function (assert) {
        var result = Validators.validateBoolean("LOEKZ", "maybe");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    // =========================================================================

    QUnit.module("Validators - Date");

    QUnit.test("validateDate - valid YYYYMMDD", function (assert) {
        var result = Validators.validateDate("ERDAT", "20231215");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "2023-12-15", "Normalized to ISO");
    });

    QUnit.test("validateDate - valid YYYY-MM-DD", function (assert) {
        var result = Validators.validateDate("ERDAT", "2023-12-15");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "2023-12-15", "Already ISO format");
    });

    QUnit.test("validateDate - valid DD.MM.YYYY", function (assert) {
        var result = Validators.validateDate("ERDAT", "15.12.2023");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "2023-12-15", "Normalized to ISO");
    });

    QUnit.test("validateDate - invalid date (Feb 30)", function (assert) {
        var result = Validators.validateDate("ERDAT", "2023-02-30");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("validateDate - invalid format", function (assert) {
        var result = Validators.validateDate("ERDAT", "not-a-date");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("validateDate - empty value", function (assert) {
        var result = Validators.validateDate("ERDAT", "");

        assert.strictEqual(result.ok, true, "Empty value is valid (optional)");
    });

    // =========================================================================

    QUnit.module("Validators - Quantity");

    QUnit.test("validateQuantity - valid decimal", function (assert) {
        var result = Validators.validateQuantity("MENGE", "123.45");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "123.45", "Normalized");
        assert.strictEqual(result.numericValue, 123.45, "Numeric value");
    });

    QUnit.test("validateQuantity - European format", function (assert) {
        var result = Validators.validateQuantity("MENGE", "1.234,56");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "1234.56", "Normalized");
    });

    QUnit.test("validateQuantity - invalid value", function (assert) {
        var result = Validators.validateQuantity("MENGE", "abc");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("validateQuantity - empty value", function (assert) {
        var result = Validators.validateQuantity("MENGE", null);

        assert.strictEqual(result.ok, true, "Empty value is valid (optional)");
    });

    // =========================================================================

    QUnit.module("Validators - Amount");

    QUnit.test("validateAmount - valid decimal", function (assert) {
        var result = Validators.validateAmount("NETWR", "999.99");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "999.99", "Normalized");
    });

    QUnit.test("validateAmount - invalid value", function (assert) {
        var result = Validators.validateAmount("NETWR", "not-a-number");

        assert.strictEqual(result.ok, false, "Validation failed");
    });

    // =========================================================================

    QUnit.module("Validators - Code Array (Timber Codes)");

    QUnit.test("validateCodeArray - valid codes", function (assert) {
        var whitelist = new Set(["ABAL", "FASY", "QURO"]);
        var result = Validators.validateCodeArray("TIMBER_CODES", "ABAL,FASY", whitelist);

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.deepEqual(result.normalizedValue, ["ABAL", "FASY"], "Normalized array");
    });

    QUnit.test("validateCodeArray - invalid format", function (assert) {
        var whitelist = new Set(["ABAL", "FASY"]);
        var result = Validators.validateCodeArray("TIMBER_CODES", "ABAL,AB", whitelist);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors for invalid format");
    });

    QUnit.test("validateCodeArray - unknown codes", function (assert) {
        var whitelist = new Set(["ABAL", "FASY"]);
        var result = Validators.validateCodeArray("TIMBER_CODES", "ABAL,XXXX", whitelist);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors for unknown code");
    });

    QUnit.test("validateCodeArray - empty value", function (assert) {
        var whitelist = new Set(["ABAL"]);
        var result = Validators.validateCodeArray("TIMBER_CODES", "", whitelist);

        assert.strictEqual(result.ok, true, "Empty value is valid");
    });

    // =========================================================================

    QUnit.module("Validators - Domain Code");

    QUnit.test("validateDomainCode - valid code", function (assert) {
        var whitelist = new Set(["A", "B", "C"]);
        var result = Validators.validateDomainCode("FIELD", "a", whitelist, "Test Domain");

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.normalizedValue, "A", "Normalized to uppercase");
    });

    QUnit.test("validateDomainCode - invalid code", function (assert) {
        var whitelist = new Set(["A", "B", "C"]);
        var result = Validators.validateDomainCode("FIELD", "Z", whitelist, "Test Domain");

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    // =========================================================================

    QUnit.module("Validators - Dependency Check");

    QUnit.test("checkDependency - valid dependency", function (assert) {
        var mainResult = FieldResult.success("MENGE", "100", "100");
        var depResult = FieldResult.success("MEINS", "KG", "KG");

        var result = Validators.checkDependency("MENGE", mainResult, "MEINS", depResult, true);

        assert.strictEqual(result.ok, true, "Validation passed");
        assert.strictEqual(result.hasErrors(), false, "No errors");
    });

    QUnit.test("checkDependency - missing dependency (mandatory)", function (assert) {
        var mainResult = FieldResult.success("MENGE", "100", "100");

        var result = Validators.checkDependency("MENGE", mainResult, "MEINS", null, true);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("checkDependency - missing dependency (optional)", function (assert) {
        var mainResult = FieldResult.success("MENGE", "100", "100");

        var result = Validators.checkDependency("MENGE", mainResult, "MEINS", null, false);

        assert.strictEqual(result.ok, true, "Still valid (warning only)");
        assert.strictEqual(result.hasWarnings(), true, "Has warnings");
    });

    QUnit.test("checkDependency - invalid dependency", function (assert) {
        var mainResult = FieldResult.success("MENGE", "100", "100");
        var depResult = FieldResult.failure("MEINS", "INVALID", "Invalid unit");

        var result = Validators.checkDependency("MENGE", mainResult, "MEINS", depResult, true);

        assert.strictEqual(result.ok, false, "Validation failed");
        assert.strictEqual(result.hasErrors(), true, "Has errors");
    });

    QUnit.test("checkDependency - empty main field (no check needed)", function (assert) {
        var mainResult = FieldResult.skipped("MENGE", null);

        var result = Validators.checkDependency("MENGE", mainResult, "MEINS", null, true);

        assert.strictEqual(result.ok, true, "Empty main field is valid");
    });

    // =========================================================================

    QUnit.module("Validators - Get Validator");

    QUnit.test("getValidator - returns correct validators", function (assert) {
        assert.strictEqual(
            Validators.getValidator(FieldTypes.FieldTypeCategory.UNIT),
            Validators.validateUnit,
            "Unit validator"
        );
        assert.strictEqual(
            Validators.getValidator(FieldTypes.FieldTypeCategory.CURRENCY),
            Validators.validateCurrency,
            "Currency validator"
        );
        assert.strictEqual(
            Validators.getValidator(FieldTypes.FieldTypeCategory.BOOLEAN),
            Validators.validateBoolean,
            "Boolean validator"
        );
        assert.strictEqual(
            Validators.getValidator(FieldTypes.FieldTypeCategory.DATS),
            Validators.validateDate,
            "Date validator"
        );
    });

    QUnit.test("getValidator - returns null for unknown", function (assert) {
        assert.strictEqual(
            Validators.getValidator("UNKNOWN"),
            null,
            "Unknown returns null"
        );
    });
});
