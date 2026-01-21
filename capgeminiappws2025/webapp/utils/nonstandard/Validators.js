/**
 * Validators.js
 *
 * Validation functions for SAP non-standard field types.
 * Each validator checks if a normalized value is valid and returns a FieldResult.
 *
 * @module utils/nonstandard/Validators
 */
sap.ui.define([
    "./FieldTypes",
    "./FieldModels",
    "./Normalizers"
], function (FieldTypes, FieldModels, Normalizers) {
    "use strict";

    var FieldResult = FieldModels.FieldResult;
    var ValidationIssue = FieldModels.ValidationIssue;

    /**
     * Validate a unit code against the T006 whitelist
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @param {Set<string>} unitWhitelist - Set of valid unit codes
     * @returns {FieldResult}
     */
    function validateUnit(fieldKey, rawValue, unitWhitelist) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normalized = Normalizers.normalizeUnit(rawValue);

        if (!unitWhitelist || unitWhitelist.size === 0) {
            var result = FieldResult.success(fieldKey, rawValue, normalized);
            result.addIssue(ValidationIssue.warn(
                "Unit whitelist not available, validation skipped",
                "Ensure T006 data is loaded"
            ));
            return result;
        }

        if (unitWhitelist.has(normalized)) {
            return FieldResult.success(fieldKey, rawValue, normalized);
        }

        return FieldResult.failure(
            fieldKey,
            rawValue,
            "Invalid unit code: '" + rawValue + "'",
            "Must be a valid unit from SAP table T006"
        );
    }

    /**
     * Validate a currency code against the TCURC whitelist
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @param {Set<string>} currencyWhitelist - Set of valid currency codes
     * @returns {FieldResult}
     */
    function validateCurrency(fieldKey, rawValue, currencyWhitelist) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normalized = Normalizers.normalizeCurrency(rawValue);

        if (!currencyWhitelist || currencyWhitelist.size === 0) {
            var result = FieldResult.success(fieldKey, rawValue, normalized);
            result.addIssue(ValidationIssue.warn(
                "Currency whitelist not available, validation skipped",
                "Ensure TCURC data is loaded"
            ));
            return result;
        }

        if (currencyWhitelist.has(normalized)) {
            return FieldResult.success(fieldKey, rawValue, normalized);
        }

        return FieldResult.failure(
            fieldKey,
            rawValue,
            "Invalid currency code: '" + rawValue + "'",
            "Must be a valid ISO 4217 currency code from SAP table TCURC"
        );
    }

    /**
     * Validate a procurement type code (BESKZ)
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @returns {FieldResult}
     */
    function validateProcurementType(fieldKey, rawValue) {
        var normalized = Normalizers.normalizeProcurementType(rawValue);

        if (FieldTypes.PROCUREMENT_TYPE_VALUES.has(normalized)) {
            return FieldResult.success(fieldKey, rawValue, normalized);
        }

        return FieldResult.failure(
            fieldKey,
            rawValue,
            "Invalid procurement type: '" + rawValue + "'",
            "Allowed values: E (in-house), F (external), X (both), or blank (none)"
        );
    }

    /**
     * Validate a boolean indicator field
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @returns {FieldResult}
     */
    function validateBoolean(fieldKey, rawValue) {
        var normalized = Normalizers.normalizeBoolean(rawValue);

        // After normalization, should be "X" or ""
        if (normalized === FieldTypes.SAPBoolean.TRUE ||
            normalized === FieldTypes.SAPBoolean.FALSE) {
            return FieldResult.success(fieldKey, rawValue, normalized);
        }

        return FieldResult.failure(
            fieldKey,
            rawValue,
            "Invalid boolean indicator: '" + rawValue + "'",
            "Use X/true/1/yes for true, or blank/false/0/no for false"
        );
    }

    /**
     * Validate a date field (DATS)
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @returns {FieldResult}
     */
    function validateDate(fieldKey, rawValue) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normResult = Normalizers.normalizeDate(rawValue);

        if (!normResult.valid) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                normResult.error,
                "Accepted formats: YYYYMMDD, YYYY-MM-DD, DD.MM.YYYY"
            );
        }

        return FieldResult.success(fieldKey, rawValue, normResult.normalized);
    }

    /**
     * Validate a quantity field (QUAN)
     * Note: Dependency on unit field is checked separately
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @returns {FieldResult}
     */
    function validateQuantity(fieldKey, rawValue) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normResult = Normalizers.normalizeQuantity(rawValue);

        if (!normResult.valid) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                normResult.error,
                "Enter a valid decimal number (use . or , as decimal separator)"
            );
        }

        var result = FieldResult.success(fieldKey, rawValue, normResult.normalized);
        result.numericValue = normResult.numericValue;
        return result;
    }

    /**
     * Validate an amount field (CURR)
     * Note: Dependency on currency field is checked separately
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @returns {FieldResult}
     */
    function validateAmount(fieldKey, rawValue) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normResult = Normalizers.normalizeAmount(rawValue);

        if (!normResult.valid) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                normResult.error,
                "Enter a valid decimal number (use . or , as decimal separator)"
            );
        }

        var result = FieldResult.success(fieldKey, rawValue, normResult.normalized);
        result.numericValue = normResult.numericValue;
        return result;
    }

    /**
     * Validate scientific product codes (EN 13556 timber codes)
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @param {Set<string>} timberCodeWhitelist - Set of valid timber codes
     * @returns {FieldResult}
     */
    function validateCodeArray(fieldKey, rawValue, timberCodeWhitelist) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normResult = Normalizers.normalizeCodeArray(rawValue);

        if (normResult.normalized.length === 0) {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var result = new FieldResult({
            key: fieldKey,
            rawValue: rawValue,
            normalizedValue: normResult.normalized,
            ok: true
        });

        // Check format
        if (normResult.invalidCodes.length > 0) {
            result.addError(
                "Invalid code format: " + normResult.invalidCodes.join(", "),
                "Codes must be exactly 4 uppercase letters"
            );
        }

        // Check against whitelist if available
        if (timberCodeWhitelist && timberCodeWhitelist.size > 0) {
            var invalidWhitelist = normResult.normalized.filter(function (code) {
                // Only check codes with valid format
                if (!/^[A-Z]{4}$/.test(code)) return false;
                return !timberCodeWhitelist.has(code);
            });

            if (invalidWhitelist.length > 0) {
                result.addError(
                    "Unknown timber codes: " + invalidWhitelist.join(", "),
                    "Must be valid EN 13556 timber species codes"
                );
            }
        }

        return result;
    }

    /**
     * Validate a domain code against a static whitelist
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @param {Set<string>} allowedValues - Set of allowed values
     * @param {string} [domainName] - Name of the domain for error messages
     * @returns {FieldResult}
     */
    function validateDomainCode(fieldKey, rawValue, allowedValues, domainName) {
        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normalized = Normalizers.normalizeDomainCode(rawValue);

        if (!allowedValues || allowedValues.size === 0) {
            var result = FieldResult.success(fieldKey, rawValue, normalized);
            result.addIssue(ValidationIssue.warn(
                "Domain whitelist not available, validation skipped"
            ));
            return result;
        }

        if (allowedValues.has(normalized)) {
            return FieldResult.success(fieldKey, rawValue, normalized);
        }

        var allowedList = Array.from(allowedValues).slice(0, 5).join(", ");
        if (allowedValues.size > 5) {
            allowedList += "...";
        }

        return FieldResult.failure(
            fieldKey,
            rawValue,
            "Invalid " + (domainName || "domain") + " code: '" + rawValue + "'",
            "Allowed values include: " + allowedList
        );
    }

    /**
     * Validate a character field with format/length constraints
     * Used for customer-specific fields like ProductHierarchy, Division, Materialstatus
     *
     * @param {string} fieldKey - Field key/name
     * @param {*} rawValue - Raw input value
     * @param {Object} [options] - Validation options
     * @param {number} [options.maxLength] - Maximum allowed length
     * @param {number} [options.exactLength] - Exact required length
     * @param {boolean} [options.alphanumeric] - If true, only allow alphanumeric characters
     * @param {string} [options.fieldName] - Human-readable field name for error messages
     * @returns {FieldResult}
     */
    function validateCharField(fieldKey, rawValue, options) {
        options = options || {};

        // Handle empty values
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return FieldResult.skipped(fieldKey, rawValue);
        }

        var normalized = String(rawValue).trim().toUpperCase();
        var fieldName = options.fieldName || fieldKey;

        // Check exact length
        if (options.exactLength && normalized.length !== options.exactLength) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                "Invalid " + fieldName + ": '" + rawValue + "' (length must be exactly " + options.exactLength + " characters)",
                "Enter exactly " + options.exactLength + " characters"
            );
        }

        // Check maximum length
        if (options.maxLength && normalized.length > options.maxLength) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                "Invalid " + fieldName + ": '" + rawValue + "' exceeds maximum length of " + options.maxLength,
                "Maximum " + options.maxLength + " characters allowed"
            );
        }

        // Check alphanumeric
        if (options.alphanumeric && !/^[A-Z0-9]+$/.test(normalized)) {
            return FieldResult.failure(
                fieldKey,
                rawValue,
                "Invalid " + fieldName + ": '" + rawValue + "' contains non-alphanumeric characters",
                "Only letters (A-Z) and numbers (0-9) are allowed"
            );
        }

        return FieldResult.success(fieldKey, rawValue, normalized);
    }

    /**
     * Check dependency between fields (e.g., QUAN requires Unit)
     *
     * @param {string} mainFieldKey - Main field key (e.g., "MENGE")
     * @param {FieldResult} mainFieldResult - Result of main field validation
     * @param {string} dependencyFieldKey - Dependency field key (e.g., "MEINS")
     * @param {FieldResult} dependencyFieldResult - Result of dependency field validation
     * @param {boolean} isMandatory - Whether the main field is mandatory
     * @returns {FieldResult} - Updated main field result
     */
    function checkDependency(mainFieldKey, mainFieldResult, dependencyFieldKey,
        dependencyFieldResult, isMandatory) {

        // If main field is empty/skipped, no dependency check needed
        if (!mainFieldResult.normalizedValue) {
            return mainFieldResult;
        }

        // Check if dependency field exists and is valid
        if (!dependencyFieldResult) {
            if (isMandatory) {
                mainFieldResult.addError(
                    "Missing required dependency field: " + dependencyFieldKey,
                    dependencyFieldKey + " is required when " + mainFieldKey + " has a value"
                );
            } else {
                mainFieldResult.addWarning(
                    "Missing dependency field: " + dependencyFieldKey,
                    dependencyFieldKey + " should be provided when " + mainFieldKey + " has a value"
                );
            }
            return mainFieldResult;
        }

        // Check if dependency field is valid
        if (!dependencyFieldResult.ok) {
            if (isMandatory) {
                mainFieldResult.addError(
                    "Invalid dependency field: " + dependencyFieldKey,
                    "Fix " + dependencyFieldKey + " errors before validating " + mainFieldKey
                );
            } else {
                mainFieldResult.addWarning(
                    "Dependency field has issues: " + dependencyFieldKey
                );
            }
            return mainFieldResult;
        }

        // Check if dependency field has a value
        if (!dependencyFieldResult.normalizedValue) {
            if (isMandatory) {
                mainFieldResult.addError(
                    "Empty dependency field: " + dependencyFieldKey,
                    dependencyFieldKey + " must have a value when " + mainFieldKey + " is set"
                );
            } else {
                mainFieldResult.addWarning(
                    "Empty dependency field: " + dependencyFieldKey,
                    "Consider providing " + dependencyFieldKey + " for " + mainFieldKey
                );
            }
        }

        return mainFieldResult;
    }

    /**
     * Get the appropriate validator for a field type category
     *
     * @param {string} fieldTypeCategory - Category from FieldTypes.FieldTypeCategory
     * @returns {Function|null} - Validator function
     */
    function getValidator(fieldTypeCategory) {
        switch (fieldTypeCategory) {
            case FieldTypes.FieldTypeCategory.UNIT:
                return validateUnit;
            case FieldTypes.FieldTypeCategory.CURRENCY:
                return validateCurrency;
            case FieldTypes.FieldTypeCategory.QUAN:
                return validateQuantity;
            case FieldTypes.FieldTypeCategory.CURR:
                return validateAmount;
            case FieldTypes.FieldTypeCategory.DATS:
                return validateDate;
            case FieldTypes.FieldTypeCategory.DOMAIN:
                return validateDomainCode;
            case FieldTypes.FieldTypeCategory.BOOLEAN:
                return validateBoolean;
            case FieldTypes.FieldTypeCategory.CODE_ARRAY:
                return validateCodeArray;
            case FieldTypes.FieldTypeCategory.CHAR:
                return validateCharField;
            default:
                return null;
        }
    }

    // =========================================================================

    return {
        validateUnit: validateUnit,
        validateCurrency: validateCurrency,
        validateProcurementType: validateProcurementType,
        validateBoolean: validateBoolean,
        validateDate: validateDate,
        validateQuantity: validateQuantity,
        validateAmount: validateAmount,
        validateCodeArray: validateCodeArray,
        validateDomainCode: validateDomainCode,
        validateCharField: validateCharField,
        checkDependency: checkDependency,
        getValidator: getValidator
    };
});
