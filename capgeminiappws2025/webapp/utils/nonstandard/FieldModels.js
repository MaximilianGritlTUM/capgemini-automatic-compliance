/**
 * FieldModels.js
 *
 * Data models for Non-Standard SAP Field Handling.
 * Defines FieldDef, ValidationIssue, and FieldResult classes.
 *
 * @module utils/nonstandard/FieldModels
 */
sap.ui.define([
    "./FieldTypes"
], function (FieldTypes) {
    "use strict";

    /**
     * Field Definition - describes an SAP field and how to validate/normalize it
     *
     * @class FieldDef
     * @param {Object} config - Configuration object
     * @param {string} config.key - Field key/name (e.g., "MEINS", "WAERS")
     * @param {string} [config.sapTable] - SAP table name (e.g., "MARA", "T006")
     * @param {string} [config.sapField] - SAP field name if different from key
     * @param {string} config.fieldTypeCategory - Category from FieldTypes.FieldTypeCategory
     * @param {string} [config.typicalType] - ABAP data type (e.g., "UNIT", "CUKY", "DATS")
     * @param {Array<string>} [config.dependencies] - Array of dependent field keys
     * @param {string} [config.whitelistSource] - Source for whitelist from FieldTypes.WhitelistSource
     * @param {boolean} [config.mandatory=false] - Whether field is mandatory
     * @param {string} [config.description] - Human-readable description
     * @param {Object} [config.customValidation] - Custom validation function or config
     */
    function FieldDef(config) {
        if (!config || !config.key) {
            throw new Error("FieldDef requires at least a 'key' property");
        }
        if (!config.fieldTypeCategory) {
            throw new Error("FieldDef requires a 'fieldTypeCategory' property");
        }

        this.key = config.key;
        this.sapTable = config.sapTable || null;
        this.sapField = config.sapField || config.key;
        this.fieldTypeCategory = config.fieldTypeCategory;
        this.typicalType = config.typicalType || null;
        this.dependencies = config.dependencies || [];
        this.whitelistSource = config.whitelistSource || null;
        this.mandatory = config.mandatory || false;
        this.description = config.description || "";
        this.customValidation = config.customValidation || null;
    }

    /**
     * Check if this field has dependencies
     * @returns {boolean}
     */
    FieldDef.prototype.hasDependencies = function () {
        return this.dependencies && this.dependencies.length > 0;
    };

    /**
     * Get first dependency field key
     * @returns {string|null}
     */
    FieldDef.prototype.getPrimaryDependency = function () {
        return this.dependencies.length > 0 ? this.dependencies[0] : null;
    };

    /**
     * Create a copy of this FieldDef with overrides
     * @param {Object} overrides - Properties to override
     * @returns {FieldDef}
     */
    FieldDef.prototype.clone = function (overrides) {
        var config = {
            key: this.key,
            sapTable: this.sapTable,
            sapField: this.sapField,
            fieldTypeCategory: this.fieldTypeCategory,
            typicalType: this.typicalType,
            dependencies: this.dependencies.slice(),
            whitelistSource: this.whitelistSource,
            mandatory: this.mandatory,
            description: this.description,
            customValidation: this.customValidation
        };
        if (overrides) {
            Object.keys(overrides).forEach(function (key) {
                config[key] = overrides[key];
            });
        }
        return new FieldDef(config);
    };

    /**
     * Serialize FieldDef to plain object
     * @returns {Object}
     */
    FieldDef.prototype.toJSON = function () {
        return {
            key: this.key,
            sapTable: this.sapTable,
            sapField: this.sapField,
            fieldTypeCategory: this.fieldTypeCategory,
            typicalType: this.typicalType,
            dependencies: this.dependencies,
            whitelistSource: this.whitelistSource,
            mandatory: this.mandatory,
            description: this.description
        };
    };

    // =========================================================================

    /**
     * Validation Issue - represents a single validation problem or warning
     *
     * @class ValidationIssue
     * @param {Object} config - Configuration object
     * @param {string} config.severity - Severity from FieldTypes.Severity
     * @param {string} config.message - Human-readable message
     * @param {string} [config.hint] - Suggestion for fixing the issue
     * @param {string} [config.code] - Machine-readable error code
     * @param {*} [config.context] - Additional context data
     */
    function ValidationIssue(config) {
        if (!config || !config.severity || !config.message) {
            throw new Error("ValidationIssue requires 'severity' and 'message' properties");
        }

        this.severity = config.severity;
        this.message = config.message;
        this.hint = config.hint || null;
        this.code = config.code || null;
        this.context = config.context || null;
    }

    /**
     * Check if this is an error
     * @returns {boolean}
     */
    ValidationIssue.prototype.isError = function () {
        return this.severity === FieldTypes.Severity.ERROR;
    };

    /**
     * Check if this is a warning
     * @returns {boolean}
     */
    ValidationIssue.prototype.isWarning = function () {
        return this.severity === FieldTypes.Severity.WARN;
    };

    /**
     * Get formatted string representation
     * @returns {string}
     */
    ValidationIssue.prototype.toString = function () {
        var str = "[" + this.severity + "] " + this.message;
        if (this.hint) {
            str += " (Hint: " + this.hint + ")";
        }
        return str;
    };

    /**
     * Serialize to plain object
     * @returns {Object}
     */
    ValidationIssue.prototype.toJSON = function () {
        return {
            severity: this.severity,
            message: this.message,
            hint: this.hint,
            code: this.code,
            context: this.context
        };
    };

    // Static factory methods for common issues
    /**
     * Create an error issue
     * @static
     * @param {string} message - Error message
     * @param {string} [hint] - Hint for resolution
     * @param {string} [code] - Error code
     * @returns {ValidationIssue}
     */
    ValidationIssue.error = function (message, hint, code) {
        return new ValidationIssue({
            severity: FieldTypes.Severity.ERROR,
            message: message,
            hint: hint,
            code: code
        });
    };

    /**
     * Create a warning issue
     * @static
     * @param {string} message - Warning message
     * @param {string} [hint] - Hint for resolution
     * @param {string} [code] - Warning code
     * @returns {ValidationIssue}
     */
    ValidationIssue.warn = function (message, hint, code) {
        return new ValidationIssue({
            severity: FieldTypes.Severity.WARN,
            message: message,
            hint: hint,
            code: code
        });
    };

    /**
     * Create an info issue
     * @static
     * @param {string} message - Info message
     * @returns {ValidationIssue}
     */
    ValidationIssue.info = function (message) {
        return new ValidationIssue({
            severity: FieldTypes.Severity.INFO,
            message: message
        });
    };

    // =========================================================================

    /**
     * Field Result - the outcome of validating/normalizing a single field
     *
     * @class FieldResult
     * @param {Object} config - Configuration object
     * @param {string} config.key - Field key/name
     * @param {*} config.rawValue - Original input value
     * @param {*} [config.normalizedValue] - Normalized output value
     * @param {boolean} [config.ok=false] - Whether validation passed
     * @param {Array<ValidationIssue>} [config.issues] - List of validation issues
     */
    function FieldResult(config) {
        if (!config || !config.key) {
            throw new Error("FieldResult requires a 'key' property");
        }

        this.key = config.key;
        this.rawValue = config.rawValue !== undefined ? config.rawValue : null;
        this.normalizedValue = config.normalizedValue !== undefined ? config.normalizedValue : null;
        this.ok = config.ok || false;
        this.issues = config.issues || [];
    }

    /**
     * Add an issue to this result
     * @param {ValidationIssue} issue - Issue to add
     * @returns {FieldResult} - This instance for chaining
     */
    FieldResult.prototype.addIssue = function (issue) {
        this.issues.push(issue);
        if (issue.isError()) {
            this.ok = false;
        }
        return this;
    };

    /**
     * Add an error to this result
     * @param {string} message - Error message
     * @param {string} [hint] - Hint for resolution
     * @param {string} [code] - Error code
     * @returns {FieldResult} - This instance for chaining
     */
    FieldResult.prototype.addError = function (message, hint, code) {
        return this.addIssue(ValidationIssue.error(message, hint, code));
    };

    /**
     * Add a warning to this result
     * @param {string} message - Warning message
     * @param {string} [hint] - Hint for resolution
     * @param {string} [code] - Warning code
     * @returns {FieldResult} - This instance for chaining
     */
    FieldResult.prototype.addWarning = function (message, hint, code) {
        return this.addIssue(ValidationIssue.warn(message, hint, code));
    };

    /**
     * Check if this result has any errors
     * @returns {boolean}
     */
    FieldResult.prototype.hasErrors = function () {
        return this.issues.some(function (issue) {
            return issue.isError();
        });
    };

    /**
     * Check if this result has any warnings
     * @returns {boolean}
     */
    FieldResult.prototype.hasWarnings = function () {
        return this.issues.some(function (issue) {
            return issue.isWarning();
        });
    };

    /**
     * Get all errors
     * @returns {Array<ValidationIssue>}
     */
    FieldResult.prototype.getErrors = function () {
        return this.issues.filter(function (issue) {
            return issue.isError();
        });
    };

    /**
     * Get all warnings
     * @returns {Array<ValidationIssue>}
     */
    FieldResult.prototype.getWarnings = function () {
        return this.issues.filter(function (issue) {
            return issue.isWarning();
        });
    };

    /**
     * Serialize to plain object
     * @returns {Object}
     */
    FieldResult.prototype.toJSON = function () {
        return {
            key: this.key,
            rawValue: this.rawValue,
            normalizedValue: this.normalizedValue,
            ok: this.ok,
            issues: this.issues.map(function (issue) {
                return issue.toJSON();
            })
        };
    };

    /**
     * Get a summary string
     * @returns {string}
     */
    FieldResult.prototype.toString = function () {
        var status = this.ok ? "OK" : "FAILED";
        var issueCount = this.issues.length;
        return this.key + ": " + status + " (" + issueCount + " issue(s))";
    };

    // Static factory methods
    /**
     * Create a successful result
     * @static
     * @param {string} key - Field key
     * @param {*} rawValue - Original value
     * @param {*} normalizedValue - Normalized value
     * @returns {FieldResult}
     */
    FieldResult.success = function (key, rawValue, normalizedValue) {
        return new FieldResult({
            key: key,
            rawValue: rawValue,
            normalizedValue: normalizedValue,
            ok: true,
            issues: []
        });
    };

    /**
     * Create a failed result with an error
     * @static
     * @param {string} key - Field key
     * @param {*} rawValue - Original value
     * @param {string} errorMessage - Error message
     * @param {string} [hint] - Hint for resolution
     * @returns {FieldResult}
     */
    FieldResult.failure = function (key, rawValue, errorMessage, hint) {
        var result = new FieldResult({
            key: key,
            rawValue: rawValue,
            normalizedValue: null,
            ok: false
        });
        result.addError(errorMessage, hint);
        return result;
    };

    /**
     * Create a skipped result (for null/undefined values on non-mandatory fields)
     * @static
     * @param {string} key - Field key
     * @param {*} rawValue - Original value
     * @returns {FieldResult}
     */
    FieldResult.skipped = function (key, rawValue) {
        return new FieldResult({
            key: key,
            rawValue: rawValue,
            normalizedValue: rawValue,
            ok: true,
            issues: [ValidationIssue.info("Field skipped (empty value)")]
        });
    };

    // =========================================================================

    return {
        FieldDef: FieldDef,
        ValidationIssue: ValidationIssue,
        FieldResult: FieldResult
    };
});
