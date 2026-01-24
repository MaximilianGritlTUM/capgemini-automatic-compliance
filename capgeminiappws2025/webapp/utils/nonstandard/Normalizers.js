/**
 * Normalizers.js
 *
 * Normalization functions for SAP non-standard field types.
 * Each normalizer transforms raw input into a canonical format.
 *
 * @module utils/nonstandard/Normalizers
 */
sap.ui.define([
    "./FieldTypes"
], function (FieldTypes) {
    "use strict";

    /**
     * Normalize a unit code (uppercase, trimmed)
     * @param {*} value - Raw input value
     * @returns {string} - Normalized unit code
     */
    function normalizeUnit(value) {
        if (value === null || value === undefined) {
            return "";
        }
        return String(value).toUpperCase().trim();
    }

    /**
     * Normalize a currency code (uppercase, trimmed)
     * @param {*} value - Raw input value
     * @returns {string} - Normalized currency code
     */
    function normalizeCurrency(value) {
        if (value === null || value === undefined) {
            return "";
        }
        return String(value).toUpperCase().trim();
    }

    /**
     * Normalize a procurement type code (uppercase, allow blank)
     * @param {*} value - Raw input value
     * @returns {string} - Normalized procurement type
     */
    function normalizeProcurementType(value) {
        if (value === null || value === undefined) {
            return "";
        }
        var normalized = String(value).toUpperCase().trim();
        // Allow empty string
        return normalized;
    }

    /**
     * Normalize a boolean indicator (SAP X/blank)
     * Accepts various truthy/falsy representations
     *
     * @param {*} value - Raw input value
     * @returns {string} - "X" for true, "" for false
     */
    function normalizeBoolean(value) {
        if (value === null || value === undefined) {
            return "";
        }

        var strValue = String(value).trim();

        // Check truthy values
        if (FieldTypes.BOOLEAN_TRUTHY.has(strValue)) {
            return FieldTypes.SAPBoolean.TRUE; // "X"
        }

        // Check falsy values (including empty)
        if (FieldTypes.BOOLEAN_FALSY.has(strValue) || strValue === "") {
            return FieldTypes.SAPBoolean.FALSE; // ""
        }

        // For boolean primitives
        if (value === true) {
            return FieldTypes.SAPBoolean.TRUE;
        }
        if (value === false) {
            return FieldTypes.SAPBoolean.FALSE;
        }

        // Unknown value - return as-is (validator will handle error)
        return strValue;
    }

    /**
     * Parse a date string and return components
     * @private
     * @param {string} dateStr - Date string
     * @returns {Object|null} - {year, month, day} or null if invalid
     */
    function _parseDateComponents(dateStr) {
        if (!dateStr) {
            return null;
        }

        var str = String(dateStr).trim();

        // Try each pattern
        for (var i = 0; i < FieldTypes.DATE_PATTERNS.length; i++) {
            var patternDef = FieldTypes.DATE_PATTERNS[i];
            var match = str.match(patternDef.pattern);

            if (match) {
                var components = {};
                patternDef.groups.forEach(function (group, idx) {
                    components[group] = parseInt(match[idx + 1], 10);
                });
                return components;
            }
        }

        return null;
    }

    /**
     * Validate date components for a real calendar date
     * @private
     * @param {number} year
     * @param {number} month
     * @param {number} day
     * @returns {boolean}
     */
    function _isValidDate(year, month, day) {
        // Basic range checks
        if (year < 1 || year > 9999) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;

        // Use Date object for validation
        var date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
    }

    /**
     * Normalize a date to ISO format (YYYY-MM-DD)
     * Accepts: YYYYMMDD, YYYY-MM-DD, DD.MM.YYYY
     *
     * @param {*} value - Raw date value
     * @returns {Object} - {normalized: string|null, valid: boolean, error: string|null}
     */
    function normalizeDate(value) {
        if (value === null || value === undefined || value === "") {
            return { normalized: null, valid: true, error: null };
        }

        var components = _parseDateComponents(value);

        if (!components) {
            return {
                normalized: null,
                valid: false,
                error: "Unrecognized date format. Use YYYYMMDD, YYYY-MM-DD, or DD.MM.YYYY"
            };
        }

        var year = components.year;
        var month = components.month;
        var day = components.day;

        // Validate the date
        if (!_isValidDate(year, month, day)) {
            return {
                normalized: null,
                valid: false,
                error: "Invalid calendar date: " + year + "-" + month + "-" + day
            };
        }

        // Format as ISO
        var normalized =
            String(year).padStart(4, "0") + "-" +
            String(month).padStart(2, "0") + "-" +
            String(day).padStart(2, "0");

        return { normalized: normalized, valid: true, error: null };
    }

    /**
     * Normalize a quantity (parse decimal, handle comma as decimal separator)
     *
     * @param {*} value - Raw quantity value
     * @returns {Object} - {normalized: string|null, numericValue: number|null, valid: boolean, error: string|null}
     */
    function normalizeQuantity(value) {
        if (value === null || value === undefined || value === "") {
            return { normalized: null, numericValue: null, valid: true, error: null };
        }

        var str = String(value).trim();

        // Handle common formats:
        // 1.234,56 (European with thousands) -> 1234.56
        // 1,234.56 (US with thousands) -> 1234.56
        // 1234,56 (European no thousands) -> 1234.56
        // 1234.56 (US no thousands) -> 1234.56

        // Determine format by looking at last separator
        var hasComma = str.indexOf(",") !== -1;
        var hasDot = str.indexOf(".") !== -1;

        var normalized = str;

        if (hasComma && hasDot) {
            // Both present - determine which is decimal separator
            var lastComma = str.lastIndexOf(",");
            var lastDot = str.lastIndexOf(".");

            if (lastComma > lastDot) {
                // European format: 1.234,56
                normalized = str.replace(/\./g, "").replace(",", ".");
            } else {
                // US format: 1,234.56
                normalized = str.replace(/,/g, "");
            }
        } else if (hasComma) {
            // Only comma - treat as decimal separator
            normalized = str.replace(",", ".");
        }
        // If only dot or neither, keep as is

        // Remove any remaining non-numeric characters except dot and minus
        normalized = normalized.replace(/[^\d.\-]/g, "");

        // Parse and validate
        var numericValue = parseFloat(normalized);

        if (isNaN(numericValue)) {
            return {
                normalized: null,
                numericValue: null,
                valid: false,
                error: "Cannot parse quantity: " + value
            };
        }

        // Format with reasonable precision (avoid floating point artifacts)
        var formattedValue = parseFloat(numericValue.toPrecision(12)).toString();

        return {
            normalized: formattedValue,
            numericValue: numericValue,
            valid: true,
            error: null
        };
    }

    /**
     * Normalize a currency amount (same parsing as quantity)
     *
     * @param {*} value - Raw amount value
     * @returns {Object} - {normalized: string|null, numericValue: number|null, valid: boolean, error: string|null}
     */
    function normalizeAmount(value) {
        // Use same logic as quantity
        var result = normalizeQuantity(value);

        if (!result.valid) {
            result.error = result.error.replace("quantity", "amount");
        }

        return result;
    }

    /**
     * Normalize scientific product codes (timber codes)
     * Split by comma/semicolon/newline, trim, uppercase
     *
     * @param {*} value - Raw value (string or array)
     * @returns {Object} - {normalized: Array<string>, valid: boolean, invalidCodes: Array<string>}
     */
    function normalizeCodeArray(value) {
        if (value === null || value === undefined || value === "") {
            return { normalized: [], valid: true, invalidCodes: [] };
        }

        var codes;

        if (Array.isArray(value)) {
            codes = value;
        } else {
            // Split string by common delimiters
            codes = String(value)
                .split(/[,;\n\r]+/)
                .map(function (s) { return s.trim(); })
                .filter(function (s) { return s.length > 0; });
        }

        // Normalize each code
        var normalized = codes.map(function (code) {
            return String(code).toUpperCase().trim();
        });

        // Check format (4-letter codes)
        var invalidCodes = normalized.filter(function (code) {
            return !/^[A-Z]{4}$/.test(code);
        });

        return {
            normalized: normalized,
            valid: invalidCodes.length === 0,
            invalidCodes: invalidCodes
        };
    }

    /**
     * Normalize a domain code (generic uppercase/trim)
     *
     * @param {*} value - Raw value
     * @returns {string} - Normalized code
     */
    function normalizeDomainCode(value) {
        if (value === null || value === undefined) {
            return "";
        }
        return String(value).toUpperCase().trim();
    }

    /**
     * Get the appropriate normalizer for a field type category
     *
     * @param {string} fieldTypeCategory - Category from FieldTypes.FieldTypeCategory
     * @returns {Function|null} - Normalizer function
     */
    function getNormalizer(fieldTypeCategory) {
        switch (fieldTypeCategory) {
            case FieldTypes.FieldTypeCategory.UNIT:
                return normalizeUnit;
            case FieldTypes.FieldTypeCategory.CURRENCY:
                return normalizeCurrency;
            case FieldTypes.FieldTypeCategory.QUAN:
                return normalizeQuantity;
            case FieldTypes.FieldTypeCategory.CURR:
                return normalizeAmount;
            case FieldTypes.FieldTypeCategory.DATS:
                return normalizeDate;
            case FieldTypes.FieldTypeCategory.DOMAIN:
                return normalizeDomainCode;
            case FieldTypes.FieldTypeCategory.BOOLEAN:
                return normalizeBoolean;
            case FieldTypes.FieldTypeCategory.CODE_ARRAY:
                return normalizeCodeArray;
            default:
                return null;
        }
    }

    // =========================================================================

    return {
        normalizeUnit: normalizeUnit,
        normalizeCurrency: normalizeCurrency,
        normalizeProcurementType: normalizeProcurementType,
        normalizeBoolean: normalizeBoolean,
        normalizeDate: normalizeDate,
        normalizeQuantity: normalizeQuantity,
        normalizeAmount: normalizeAmount,
        normalizeCodeArray: normalizeCodeArray,
        normalizeDomainCode: normalizeDomainCode,
        getNormalizer: getNormalizer
    };
});
