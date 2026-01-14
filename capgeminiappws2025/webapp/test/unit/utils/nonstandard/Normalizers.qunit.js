/**
 * Unit tests for Normalizers.js
 *
 * Tests normalization functions for all field types.
 */
sap.ui.define([
    "capgeminiappws2025/utils/nonstandard/Normalizers",
    "capgeminiappws2025/utils/nonstandard/FieldTypes"
], function (Normalizers, FieldTypes) {
    "use strict";

    QUnit.module("Normalizers - Unit");

    QUnit.test("normalizeUnit - should uppercase and trim", function (assert) {
        assert.strictEqual(Normalizers.normalizeUnit("kg"), "KG", "Lowercase to uppercase");
        assert.strictEqual(Normalizers.normalizeUnit("  KG  "), "KG", "Trim whitespace");
        assert.strictEqual(Normalizers.normalizeUnit("Kg"), "KG", "Mixed case");
    });

    QUnit.test("normalizeUnit - should handle null/undefined", function (assert) {
        assert.strictEqual(Normalizers.normalizeUnit(null), "", "Null returns empty");
        assert.strictEqual(Normalizers.normalizeUnit(undefined), "", "Undefined returns empty");
    });

    // =========================================================================

    QUnit.module("Normalizers - Currency");

    QUnit.test("normalizeCurrency - should uppercase and trim", function (assert) {
        assert.strictEqual(Normalizers.normalizeCurrency("eur"), "EUR", "Lowercase to uppercase");
        assert.strictEqual(Normalizers.normalizeCurrency("  USD  "), "USD", "Trim whitespace");
        assert.strictEqual(Normalizers.normalizeCurrency("Gbp"), "GBP", "Mixed case");
    });

    QUnit.test("normalizeCurrency - should handle null/undefined", function (assert) {
        assert.strictEqual(Normalizers.normalizeCurrency(null), "", "Null returns empty");
        assert.strictEqual(Normalizers.normalizeCurrency(undefined), "", "Undefined returns empty");
    });

    // =========================================================================

    QUnit.module("Normalizers - Procurement Type");

    QUnit.test("normalizeProcurementType - should handle valid values", function (assert) {
        assert.strictEqual(Normalizers.normalizeProcurementType("e"), "E", "Lowercase E");
        assert.strictEqual(Normalizers.normalizeProcurementType("F"), "F", "Uppercase F");
        assert.strictEqual(Normalizers.normalizeProcurementType("x"), "X", "Lowercase X");
        assert.strictEqual(Normalizers.normalizeProcurementType(""), "", "Empty string");
        assert.strictEqual(Normalizers.normalizeProcurementType("  "), "", "Whitespace only");
    });

    QUnit.test("normalizeProcurementType - should handle null/undefined", function (assert) {
        assert.strictEqual(Normalizers.normalizeProcurementType(null), "", "Null returns empty");
        assert.strictEqual(Normalizers.normalizeProcurementType(undefined), "", "Undefined returns empty");
    });

    // =========================================================================

    QUnit.module("Normalizers - Boolean");

    QUnit.test("normalizeBoolean - should recognize truthy values", function (assert) {
        assert.strictEqual(Normalizers.normalizeBoolean("X"), "X", "X");
        assert.strictEqual(Normalizers.normalizeBoolean("x"), "X", "lowercase x");
        assert.strictEqual(Normalizers.normalizeBoolean("true"), "X", "true string");
        assert.strictEqual(Normalizers.normalizeBoolean("TRUE"), "X", "TRUE string");
        assert.strictEqual(Normalizers.normalizeBoolean("1"), "X", "1 string");
        assert.strictEqual(Normalizers.normalizeBoolean("yes"), "X", "yes string");
        assert.strictEqual(Normalizers.normalizeBoolean("YES"), "X", "YES string");
        assert.strictEqual(Normalizers.normalizeBoolean("y"), "X", "y");
        assert.strictEqual(Normalizers.normalizeBoolean("Y"), "X", "Y");
        assert.strictEqual(Normalizers.normalizeBoolean(true), "X", "boolean true");
    });

    QUnit.test("normalizeBoolean - should recognize falsy values", function (assert) {
        assert.strictEqual(Normalizers.normalizeBoolean(""), "", "empty string");
        assert.strictEqual(Normalizers.normalizeBoolean(" "), "", "space");
        assert.strictEqual(Normalizers.normalizeBoolean("false"), "", "false string");
        assert.strictEqual(Normalizers.normalizeBoolean("FALSE"), "", "FALSE string");
        assert.strictEqual(Normalizers.normalizeBoolean("0"), "", "0 string");
        assert.strictEqual(Normalizers.normalizeBoolean("no"), "", "no string");
        assert.strictEqual(Normalizers.normalizeBoolean("NO"), "", "NO string");
        assert.strictEqual(Normalizers.normalizeBoolean("n"), "", "n");
        assert.strictEqual(Normalizers.normalizeBoolean("N"), "", "N");
        assert.strictEqual(Normalizers.normalizeBoolean(false), "", "boolean false");
    });

    QUnit.test("normalizeBoolean - should handle null/undefined", function (assert) {
        assert.strictEqual(Normalizers.normalizeBoolean(null), "", "Null returns empty");
        assert.strictEqual(Normalizers.normalizeBoolean(undefined), "", "Undefined returns empty");
    });

    // =========================================================================

    QUnit.module("Normalizers - Date");

    QUnit.test("normalizeDate - should parse YYYYMMDD format", function (assert) {
        var result = Normalizers.normalizeDate("20231215");
        assert.strictEqual(result.valid, true, "Valid date");
        assert.strictEqual(result.normalized, "2023-12-15", "Normalized to ISO");
    });

    QUnit.test("normalizeDate - should parse YYYY-MM-DD format", function (assert) {
        var result = Normalizers.normalizeDate("2023-12-15");
        assert.strictEqual(result.valid, true, "Valid date");
        assert.strictEqual(result.normalized, "2023-12-15", "Already ISO format");
    });

    QUnit.test("normalizeDate - should parse DD.MM.YYYY format", function (assert) {
        var result = Normalizers.normalizeDate("15.12.2023");
        assert.strictEqual(result.valid, true, "Valid date");
        assert.strictEqual(result.normalized, "2023-12-15", "Normalized to ISO");
    });

    QUnit.test("normalizeDate - should reject invalid dates", function (assert) {
        var result1 = Normalizers.normalizeDate("2023-02-30");
        assert.strictEqual(result1.valid, false, "Feb 30 is invalid");

        var result2 = Normalizers.normalizeDate("2023-13-01");
        assert.strictEqual(result2.valid, false, "Month 13 is invalid");

        var result3 = Normalizers.normalizeDate("invalid");
        assert.strictEqual(result3.valid, false, "Random string is invalid");
    });

    QUnit.test("normalizeDate - should handle empty values", function (assert) {
        var result1 = Normalizers.normalizeDate(null);
        assert.strictEqual(result1.valid, true, "Null is valid (optional)");
        assert.strictEqual(result1.normalized, null, "Null returns null");

        var result2 = Normalizers.normalizeDate("");
        assert.strictEqual(result2.valid, true, "Empty is valid (optional)");
        assert.strictEqual(result2.normalized, null, "Empty returns null");
    });

    // =========================================================================

    QUnit.module("Normalizers - Quantity");

    QUnit.test("normalizeQuantity - should parse standard decimals", function (assert) {
        var result = Normalizers.normalizeQuantity("123.45");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "123.45", "Dot decimal");
        assert.strictEqual(result.numericValue, 123.45, "Numeric value");
    });

    QUnit.test("normalizeQuantity - should parse European format (comma decimal)", function (assert) {
        var result = Normalizers.normalizeQuantity("123,45");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "123.45", "Comma to dot");
        assert.strictEqual(result.numericValue, 123.45, "Numeric value");
    });

    QUnit.test("normalizeQuantity - should parse European format with thousands", function (assert) {
        var result = Normalizers.normalizeQuantity("1.234,56");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "1234.56", "Thousands removed");
        assert.strictEqual(result.numericValue, 1234.56, "Numeric value");
    });

    QUnit.test("normalizeQuantity - should parse US format with thousands", function (assert) {
        var result = Normalizers.normalizeQuantity("1,234.56");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "1234.56", "Thousands removed");
        assert.strictEqual(result.numericValue, 1234.56, "Numeric value");
    });

    QUnit.test("normalizeQuantity - should handle integers", function (assert) {
        var result = Normalizers.normalizeQuantity("1234");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "1234", "Integer");
        assert.strictEqual(result.numericValue, 1234, "Numeric value");
    });

    QUnit.test("normalizeQuantity - should handle negative numbers", function (assert) {
        var result = Normalizers.normalizeQuantity("-123.45");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.numericValue, -123.45, "Negative value");
    });

    QUnit.test("normalizeQuantity - should reject non-numeric", function (assert) {
        var result = Normalizers.normalizeQuantity("abc");
        assert.strictEqual(result.valid, false, "Invalid");
        assert.notStrictEqual(result.error, null, "Has error message");
    });

    QUnit.test("normalizeQuantity - should handle empty values", function (assert) {
        var result = Normalizers.normalizeQuantity(null);
        assert.strictEqual(result.valid, true, "Null is valid");
        assert.strictEqual(result.normalized, null, "Null returns null");
    });

    // =========================================================================

    QUnit.module("Normalizers - Amount");

    QUnit.test("normalizeAmount - should work same as quantity", function (assert) {
        var result = Normalizers.normalizeAmount("1.234,56");
        assert.strictEqual(result.valid, true, "Valid");
        assert.strictEqual(result.normalized, "1234.56", "Normalized");
        assert.strictEqual(result.numericValue, 1234.56, "Numeric value");
    });

    // =========================================================================

    QUnit.module("Normalizers - Code Array");

    QUnit.test("normalizeCodeArray - should split by comma", function (assert) {
        var result = Normalizers.normalizeCodeArray("ABAL,FASY,QURO");
        assert.strictEqual(result.valid, true, "Valid format");
        assert.deepEqual(result.normalized, ["ABAL", "FASY", "QURO"], "Split correctly");
    });

    QUnit.test("normalizeCodeArray - should split by semicolon", function (assert) {
        var result = Normalizers.normalizeCodeArray("ABAL;FASY;QURO");
        assert.strictEqual(result.valid, true, "Valid format");
        assert.deepEqual(result.normalized, ["ABAL", "FASY", "QURO"], "Split correctly");
    });

    QUnit.test("normalizeCodeArray - should split by newline", function (assert) {
        var result = Normalizers.normalizeCodeArray("ABAL\nFASY\nQURO");
        assert.strictEqual(result.valid, true, "Valid format");
        assert.deepEqual(result.normalized, ["ABAL", "FASY", "QURO"], "Split correctly");
    });

    QUnit.test("normalizeCodeArray - should uppercase and trim", function (assert) {
        var result = Normalizers.normalizeCodeArray("  abal , fasy  ");
        assert.deepEqual(result.normalized, ["ABAL", "FASY"], "Uppercased and trimmed");
    });

    QUnit.test("normalizeCodeArray - should handle arrays", function (assert) {
        var result = Normalizers.normalizeCodeArray(["abal", "fasy"]);
        assert.deepEqual(result.normalized, ["ABAL", "FASY"], "Array input");
    });

    QUnit.test("normalizeCodeArray - should detect invalid format codes", function (assert) {
        var result = Normalizers.normalizeCodeArray("ABAL,AB,ABCDE");
        assert.strictEqual(result.valid, false, "Has invalid codes");
        assert.deepEqual(result.invalidCodes, ["AB", "ABCDE"], "Lists invalid codes");
    });

    QUnit.test("normalizeCodeArray - should handle empty values", function (assert) {
        var result1 = Normalizers.normalizeCodeArray(null);
        assert.deepEqual(result1.normalized, [], "Null returns empty array");

        var result2 = Normalizers.normalizeCodeArray("");
        assert.deepEqual(result2.normalized, [], "Empty returns empty array");
    });

    // =========================================================================

    QUnit.module("Normalizers - Get Normalizer");

    QUnit.test("getNormalizer - should return correct normalizers", function (assert) {
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.UNIT),
            Normalizers.normalizeUnit,
            "Unit normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.CURRENCY),
            Normalizers.normalizeCurrency,
            "Currency normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.BOOLEAN),
            Normalizers.normalizeBoolean,
            "Boolean normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.DATS),
            Normalizers.normalizeDate,
            "Date normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.QUAN),
            Normalizers.normalizeQuantity,
            "Quantity normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.CURR),
            Normalizers.normalizeAmount,
            "Amount normalizer"
        );
        assert.strictEqual(
            Normalizers.getNormalizer(FieldTypes.FieldTypeCategory.CODE_ARRAY),
            Normalizers.normalizeCodeArray,
            "Code array normalizer"
        );
    });

    QUnit.test("getNormalizer - should return null for unknown type", function (assert) {
        assert.strictEqual(
            Normalizers.getNormalizer("UNKNOWN"),
            null,
            "Unknown type returns null"
        );
    });
});
