/**
 * FieldProcessor.js
 *
 * Main entry point for Non-Standard SAP Field Handling.
 * Provides unified API for validating and normalizing SAP records.
 *
 * @module utils/nonstandard/FieldProcessor
 */
sap.ui.define([
    "./FieldTypes",
    "./FieldModels",
    "./Normalizers",
    "./Validators",
    "./WhitelistCache",
    "./WhitelistLoader"
], function (FieldTypes, FieldModels, Normalizers, Validators, WhitelistCache, WhitelistLoader) {
    "use strict";

    var FieldDef = FieldModels.FieldDef;
    var FieldResult = FieldModels.FieldResult;
    var ValidationIssue = FieldModels.ValidationIssue;

    /**
     * FieldProcessor - validates and normalizes SAP records
     *
     * @class FieldProcessor
     * @param {Object} [options] - Configuration options
     * @param {sap.ui.model.odata.v2.ODataModel} [options.oDataModel] - OData model for SAP access
     * @param {WhitelistCache.WhitelistCache} [options.cache] - Cache instance
     * @param {Object<string, FieldDef>} [options.fieldDefs] - Pre-configured field definitions
     */
    function FieldProcessor(options) {
        options = options || {};

        this._cache = options.cache || WhitelistCache.getGlobalCache();
        this._loader = new WhitelistLoader.WhitelistLoader(options.oDataModel, this._cache);
        this._fieldDefs = {};
        this._customWhitelists = {};

        // Register pre-configured field definitions
        if (options.fieldDefs) {
            var self = this;
            Object.keys(options.fieldDefs).forEach(function (key) {
                self.registerFieldDef(options.fieldDefs[key]);
            });
        }

        // Register default field definitions
        this._registerDefaultFieldDefs();
    }

    /**
     * Register default SAP field definitions
     * @private
     */
    FieldProcessor.prototype._registerDefaultFieldDefs = function () {
        var FieldTypeCategory = FieldTypes.FieldTypeCategory;
        var WhitelistSource = FieldTypes.WhitelistSource;

        // Unit fields
        this.registerFieldDef(new FieldDef({
            key: "MEINS",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Base unit of measure"
        }));

        this.registerFieldDef(new FieldDef({
            key: "GEWEI",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Weight unit"
        }));

        this.registerFieldDef(new FieldDef({
            key: "VOLEH",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Volume unit"
        }));

        // Currency fields
        this.registerFieldDef(new FieldDef({
            key: "WAERS",
            sapTable: "VBAK",
            fieldTypeCategory: FieldTypeCategory.CURRENCY,
            whitelistSource: WhitelistSource.TCURC,
            description: "Currency key"
        }));

        // Quantity fields with dependencies
        this.registerFieldDef(new FieldDef({
            key: "MENGE",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["MEINS"],
            description: "Order quantity"
        }));

        this.registerFieldDef(new FieldDef({
            key: "NTGEW",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["GEWEI"],
            description: "Net weight"
        }));

        this.registerFieldDef(new FieldDef({
            key: "BRGEW",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["GEWEI"],
            description: "Gross weight"
        }));

        this.registerFieldDef(new FieldDef({
            key: "VOLUM",
            sapTable: "MARA",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["VOLEH"],
            description: "Volume"
        }));

        // Amount fields with dependencies
        this.registerFieldDef(new FieldDef({
            key: "NETWR",
            sapTable: "VBAP",
            fieldTypeCategory: FieldTypeCategory.CURR,
            dependencies: ["WAERS"],
            description: "Net value"
        }));

        this.registerFieldDef(new FieldDef({
            key: "MWSBP",
            sapTable: "VBAP",
            fieldTypeCategory: FieldTypeCategory.CURR,
            dependencies: ["WAERS"],
            description: "Tax amount"
        }));

        // Date fields
        this.registerFieldDef(new FieldDef({
            key: "ERDAT",
            fieldTypeCategory: FieldTypeCategory.DATS,
            description: "Creation date"
        }));

        this.registerFieldDef(new FieldDef({
            key: "AEDAT",
            fieldTypeCategory: FieldTypeCategory.DATS,
            description: "Change date"
        }));

        this.registerFieldDef(new FieldDef({
            key: "LFDAT",
            fieldTypeCategory: FieldTypeCategory.DATS,
            description: "Delivery date"
        }));

        // Domain fields
        this.registerFieldDef(new FieldDef({
            key: "BESKZ",
            sapTable: "MARC",
            fieldTypeCategory: FieldTypeCategory.DOMAIN,
            whitelistSource: WhitelistSource.STATIC,
            description: "Procurement type"
        }));

        // Boolean indicator fields
        this.registerFieldDef(new FieldDef({
            key: "LOEKZ",
            fieldTypeCategory: FieldTypeCategory.BOOLEAN,
            description: "Deletion indicator"
        }));

        this.registerFieldDef(new FieldDef({
            key: "LVORM",
            fieldTypeCategory: FieldTypeCategory.BOOLEAN,
            description: "Deletion flag (material)"
        }));

        // Scientific products (timber codes)
        this.registerFieldDef(new FieldDef({
            key: "TIMBER_CODES",
            fieldTypeCategory: FieldTypeCategory.CODE_ARRAY,
            whitelistSource: WhitelistSource.EN13556,
            description: "EN 13556 timber species codes"
        }));

        // =====================================================================
        // CDS View Field Names
        // These map to the actual field names used in the CDS views
        // =====================================================================

        // Unit fields (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "OrderUnit",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Order unit of measure"
        }));

        this.registerFieldDef(new FieldDef({
            key: "WeightUnit",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Weight unit"
        }));

        this.registerFieldDef(new FieldDef({
            key: "VolumeUnit",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Volume unit"
        }));

        // Date fields (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "DeliveryDate",
            fieldTypeCategory: FieldTypeCategory.DATS,
            description: "Delivery date"
        }));

        this.registerFieldDef(new FieldDef({
            key: "PurchaseOrderDate",
            fieldTypeCategory: FieldTypeCategory.DATS,
            description: "Purchase order date"
        }));

        // Quantity fields with dependencies (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "NetWeight",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["WeightUnit"],
            description: "Net weight"
        }));

        this.registerFieldDef(new FieldDef({
            key: "OrderQuantity",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["OrderUnit"],
            description: "Order quantity"
        }));

        this.registerFieldDef(new FieldDef({
            key: "Volume",
            fieldTypeCategory: FieldTypeCategory.QUAN,
            dependencies: ["VolumeUnit"],
            description: "Volume"
        }));

        // Amount fields (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "NetOrderValue",
            fieldTypeCategory: FieldTypeCategory.CURR,
            description: "Net order value"
        }));

        // Scientific products - EN 13556 timber codes (CDS name)
        this.registerFieldDef(new FieldDef({
            key: "ScientificProducts",
            fieldTypeCategory: FieldTypeCategory.CODE_ARRAY,
            whitelistSource: WhitelistSource.EN13556,
            description: "Scientific product codes (EN 13556)"
        }));

        // Material master fields (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "MaterialType",
            fieldTypeCategory: FieldTypeCategory.DOMAIN,
            whitelistSource: WhitelistSource.T134,
            description: "Material type (T134)"
        }));

        this.registerFieldDef(new FieldDef({
            key: "ProductHierarchy",
            fieldTypeCategory: FieldTypeCategory.CHAR,
            charOptions: {
                maxLength: 18,
                alphanumeric: true,
                fieldName: "Product hierarchy (T179)"
            },
            description: "Product hierarchy (T179)"
        }));

        this.registerFieldDef(new FieldDef({
            key: "BaseUnitOfMeasure",
            fieldTypeCategory: FieldTypeCategory.UNIT,
            whitelistSource: WhitelistSource.T006,
            description: "Base unit of measure"
        }));

        this.registerFieldDef(new FieldDef({
            key: "Division",
            fieldTypeCategory: FieldTypeCategory.CHAR,
            charOptions: {
                exactLength: 2,
                fieldName: "Division (TSPA)"
            },
            description: "Division (TSPA)"
        }));

        // Boolean/indicator fields (CDS names)
        this.registerFieldDef(new FieldDef({
            key: "HazardousMaterialWarning",
            fieldTypeCategory: FieldTypeCategory.BOOLEAN,
            description: "Hazardous material warning"
        }));

        this.registerFieldDef(new FieldDef({
            key: "Materialstatus",
            fieldTypeCategory: FieldTypeCategory.CHAR,
            charOptions: {
                exactLength: 2,
                fieldName: "Material status"
            },
            description: "Material status (CHAR 2)"
        }));
    };

    /**
     * Register a field definition
     * @param {FieldDef} fieldDef - Field definition to register
     */
    FieldProcessor.prototype.registerFieldDef = function (fieldDef) {
        if (!(fieldDef instanceof FieldDef)) {
            fieldDef = new FieldDef(fieldDef);
        }
        this._fieldDefs[fieldDef.key] = fieldDef;
    };

    /**
     * Get a registered field definition
     * @param {string} key - Field key
     * @returns {FieldDef|null}
     */
    FieldProcessor.prototype.getFieldDef = function (key) {
        return this._fieldDefs[key] || null;
    };

    /**
     * Get all registered field definitions
     * @returns {Object<string, FieldDef>}
     */
    FieldProcessor.prototype.getFieldDefs = function () {
        return Object.assign({}, this._fieldDefs);
    };

    /**
     * Register a custom whitelist
     * @param {string} key - Whitelist key
     * @param {Set<string>|Array<string>} values - Allowed values
     */
    FieldProcessor.prototype.registerWhitelist = function (key, values) {
        var set = values instanceof Set ? values : new Set(values);
        this._customWhitelists[key] = set;
        this._cache.set(key, set);
    };

    /**
     * Preload all whitelists (should be called at app startup)
     * @returns {Promise<void>}
     */
    FieldProcessor.prototype.preloadWhitelists = function () {
        return this._loader.preloadAll();
    };

    /**
     * Get whitelist for a field definition
     * @private
     * @param {FieldDef} fieldDef - Field definition
     * @returns {Promise<Set<string>|null>}
     */
    FieldProcessor.prototype._getWhitelist = function (fieldDef) {
        if (!fieldDef.whitelistSource) {
            return Promise.resolve(null);
        }

        // Check custom whitelists first
        if (this._customWhitelists[fieldDef.whitelistSource]) {
            return Promise.resolve(this._customWhitelists[fieldDef.whitelistSource]);
        }

        // Handle static domain whitelists
        if (fieldDef.whitelistSource === FieldTypes.WhitelistSource.STATIC) {
            if (fieldDef.key === "BESKZ") {
                return Promise.resolve(FieldTypes.PROCUREMENT_TYPE_VALUES);
            }
            return Promise.resolve(null);
        }

        // Load from cache/loader
        return this._cache.getOrLoad(fieldDef.whitelistSource);
    };

    /**
     * Validate and normalize a single field
     *
     * @param {Object} record - Data record
     * @param {FieldDef} fieldDef - Field definition
     * @returns {Promise<FieldResult>}
     */
    FieldProcessor.prototype.validateField = function (record, fieldDef) {
        var self = this;
        var rawValue = record[fieldDef.key];

        return this._getWhitelist(fieldDef).then(function (whitelist) {
            var result;

            switch (fieldDef.fieldTypeCategory) {
                case FieldTypes.FieldTypeCategory.UNIT:
                    result = Validators.validateUnit(fieldDef.key, rawValue, whitelist);
                    break;

                case FieldTypes.FieldTypeCategory.CURRENCY:
                    result = Validators.validateCurrency(fieldDef.key, rawValue, whitelist);
                    break;

                case FieldTypes.FieldTypeCategory.QUAN:
                    result = Validators.validateQuantity(fieldDef.key, rawValue);
                    break;

                case FieldTypes.FieldTypeCategory.CURR:
                    result = Validators.validateAmount(fieldDef.key, rawValue);
                    break;

                case FieldTypes.FieldTypeCategory.DATS:
                    result = Validators.validateDate(fieldDef.key, rawValue);
                    break;

                case FieldTypes.FieldTypeCategory.DOMAIN:
                    if (fieldDef.key === "BESKZ") {
                        result = Validators.validateProcurementType(fieldDef.key, rawValue);
                    } else {
                        result = Validators.validateDomainCode(
                            fieldDef.key,
                            rawValue,
                            whitelist,
                            fieldDef.description
                        );
                    }
                    break;

                case FieldTypes.FieldTypeCategory.BOOLEAN:
                    result = Validators.validateBoolean(fieldDef.key, rawValue);
                    break;

                case FieldTypes.FieldTypeCategory.CODE_ARRAY:
                    result = Validators.validateCodeArray(fieldDef.key, rawValue, whitelist);
                    break;

                case FieldTypes.FieldTypeCategory.CHAR:
                    result = Validators.validateCharField(fieldDef.key, rawValue, fieldDef.charOptions);
                    break;

                default:
                    result = FieldResult.failure(
                        fieldDef.key,
                        rawValue,
                        "Unknown field type category: " + fieldDef.fieldTypeCategory
                    );
            }

            return result;
        });
    };

    /**
     * Check dependencies for a field result
     * @private
     * @param {Object} record - Data record
     * @param {FieldDef} fieldDef - Field definition
     * @param {FieldResult} result - Validation result for main field
     * @param {Object<string, FieldResult>} allResults - All field results
     * @returns {FieldResult}
     */
    FieldProcessor.prototype._checkDependencies = function (record, fieldDef, result, allResults) {
        if (!fieldDef.hasDependencies()) {
            return result;
        }

        var self = this;

        fieldDef.dependencies.forEach(function (depKey) {
            var depResult = allResults[depKey];
            result = Validators.checkDependency(
                fieldDef.key,
                result,
                depKey,
                depResult,
                fieldDef.mandatory
            );
        });

        return result;
    };

    /**
     * Process a complete record with multiple fields
     *
     * @param {Object} record - Data record
     * @param {Array<FieldDef|string>} [fieldDefsOrKeys] - Field definitions or keys to validate
     *        If not provided, validates all registered fields that exist in the record
     * @returns {Promise<Array<FieldResult>>}
     */
    FieldProcessor.prototype.processRecord = function (record, fieldDefsOrKeys) {
        var self = this;
        var fieldDefs = [];

        if (fieldDefsOrKeys && fieldDefsOrKeys.length > 0) {
            // Use provided field definitions
            fieldDefsOrKeys.forEach(function (item) {
                if (item instanceof FieldDef) {
                    fieldDefs.push(item);
                } else if (typeof item === "string") {
                    var def = self.getFieldDef(item);
                    if (def) {
                        fieldDefs.push(def);
                    }
                }
            });
        } else {
            // Auto-detect fields from record
            Object.keys(record).forEach(function (key) {
                var def = self.getFieldDef(key);
                if (def) {
                    fieldDefs.push(def);
                }
            });
        }

        // First pass: validate all fields without dependencies
        var validationPromises = fieldDefs.map(function (fieldDef) {
            return self.validateField(record, fieldDef).then(function (result) {
                return { fieldDef: fieldDef, result: result };
            });
        });

        return Promise.all(validationPromises).then(function (results) {
            // Build results map
            var resultsMap = {};
            results.forEach(function (item) {
                resultsMap[item.fieldDef.key] = item.result;
            });

            // Second pass: check dependencies
            results.forEach(function (item) {
                item.result = self._checkDependencies(
                    record,
                    item.fieldDef,
                    item.result,
                    resultsMap
                );
            });

            return results.map(function (item) {
                return item.result;
            });
        });
    };

    /**
     * Validate and normalize a single field value (convenience method)
     *
     * @param {string} fieldKey - Field key
     * @param {*} value - Value to validate
     * @returns {Promise<FieldResult>}
     */
    FieldProcessor.prototype.validateValue = function (fieldKey, value) {
        var record = {};
        record[fieldKey] = value;

        var fieldDef = this.getFieldDef(fieldKey);
        if (!fieldDef) {
            return Promise.resolve(
                FieldResult.failure(fieldKey, value, "Unknown field: " + fieldKey)
            );
        }

        return this.validateField(record, fieldDef);
    };

    /**
     * Create a normalized record from validation results
     *
     * @param {Array<FieldResult>} results - Validation results
     * @param {Object} [originalRecord] - Original record for unvalidated fields
     * @returns {Object} - Normalized record
     */
    FieldProcessor.prototype.createNormalizedRecord = function (results, originalRecord) {
        var normalized = originalRecord ? Object.assign({}, originalRecord) : {};

        results.forEach(function (result) {
            if (result.normalizedValue !== null && result.normalizedValue !== undefined) {
                normalized[result.key] = result.normalizedValue;
            }
        });

        return normalized;
    };

    /**
     * Get summary of validation results
     *
     * @param {Array<FieldResult>} results - Validation results
     * @returns {Object} - Summary object
     */
    FieldProcessor.prototype.getSummary = function (results) {
        var summary = {
            total: results.length,
            valid: 0,
            invalid: 0,
            skipped: 0,
            errors: [],
            warnings: []
        };

        results.forEach(function (result) {
            if (result.ok) {
                if (result.issues.some(function (i) {
                    return i.message.indexOf("skipped") !== -1;
                })) {
                    summary.skipped++;
                } else {
                    summary.valid++;
                }
            } else {
                summary.invalid++;
            }

            result.getErrors().forEach(function (error) {
                summary.errors.push({
                    field: result.key,
                    message: error.message,
                    hint: error.hint
                });
            });

            result.getWarnings().forEach(function (warning) {
                summary.warnings.push({
                    field: result.key,
                    message: warning.message,
                    hint: warning.hint
                });
            });
        });

        summary.isValid = summary.invalid === 0;

        return summary;
    };

    /**
     * Get the cache instance
     * @returns {WhitelistCache.WhitelistCache}
     */
    FieldProcessor.prototype.getCache = function () {
        return this._cache;
    };

    /**
     * Get the whitelist loader
     * @returns {WhitelistLoader.WhitelistLoader}
     */
    FieldProcessor.prototype.getLoader = function () {
        return this._loader;
    };

    // =========================================================================
    // Static factory methods
    // =========================================================================

    /**
     * Create a FieldProcessor with OData model
     * @static
     * @param {sap.ui.model.odata.v2.ODataModel} oDataModel - OData model
     * @returns {FieldProcessor}
     */
    FieldProcessor.create = function (oDataModel) {
        return new FieldProcessor({ oDataModel: oDataModel });
    };

    /**
     * Create a FieldProcessor for offline/testing use
     * @static
     * @returns {FieldProcessor}
     */
    FieldProcessor.createOffline = function () {
        return new FieldProcessor();
    };

    // =========================================================================
    // Convenience exports
    // =========================================================================

    return {
        FieldProcessor: FieldProcessor,

        // Re-export commonly used classes
        FieldDef: FieldDef,
        FieldResult: FieldResult,
        ValidationIssue: ValidationIssue,

        // Re-export enums
        FieldTypeCategory: FieldTypes.FieldTypeCategory,
        Severity: FieldTypes.Severity,
        WhitelistSource: FieldTypes.WhitelistSource,

        // Re-export utilities
        Normalizers: Normalizers,
        Validators: Validators
    };
});
