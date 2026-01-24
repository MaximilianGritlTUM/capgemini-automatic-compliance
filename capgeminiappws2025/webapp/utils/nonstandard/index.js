/**
 * index.js
 *
 * Main entry point for Non-Standard SAP Field Handling module.
 * Re-exports all components for convenient importing.
 *
 * @module utils/nonstandard
 *
 * @example
 * // Import the main processor
 * sap.ui.define([
 *     "capgeminiappws2025/utils/nonstandard/FieldProcessor"
 * ], function(FieldProcessor) {
 *     var processor = FieldProcessor.FieldProcessor.createOffline();
 *     // or with OData: FieldProcessor.FieldProcessor.create(oDataModel);
 * });
 *
 * @example
 * // Import specific components
 * sap.ui.define([
 *     "capgeminiappws2025/utils/nonstandard/FieldTypes",
 *     "capgeminiappws2025/utils/nonstandard/FieldModels",
 *     "capgeminiappws2025/utils/nonstandard/Normalizers",
 *     "capgeminiappws2025/utils/nonstandard/Validators"
 * ], function(FieldTypes, FieldModels, Normalizers, Validators) {
 *     // Use individual components
 * });
 */
sap.ui.define([
    "./FieldTypes",
    "./FieldModels",
    "./WhitelistCache",
    "./WhitelistLoader",
    "./Normalizers",
    "./Validators",
    "./FieldProcessor"
], function (FieldTypes, FieldModels, WhitelistCache, WhitelistLoader, Normalizers, Validators, FieldProcessor) {
    "use strict";

    /**
     * Non-Standard SAP Field Handling Module
     *
     * This module provides validation and normalization for SAP fields that require
     * special handling, including:
     *
     * - Unit of measure fields (T006-backed)
     * - Currency key fields (TCURC-backed)
     * - Quantity fields with unit dependencies
     * - Amount/currency fields with currency key dependencies
     * - Date fields (DATS format)
     * - Domain/code fields (e.g., procurement type)
     * - Boolean indicator fields (SAP X/blank)
     * - Custom array fields (e.g., EN 13556 timber codes)
     *
     * ## Quick Start
     *
     * ```javascript
     * // Create processor (offline mode for testing)
     * var processor = FieldProcessor.FieldProcessor.createOffline();
     *
     * // Or with OData connection
     * var processor = FieldProcessor.FieldProcessor.create(oDataModel);
     *
     * // Validate a single field
     * processor.validateValue("MEINS", "kg").then(function(result) {
     *     if (result.ok) {
     *         console.log("Normalized:", result.normalizedValue); // "KG"
     *     }
     * });
     *
     * // Process a complete record
     * var record = {
     *     MEINS: "kg",
     *     MENGE: "100.50",
     *     WAERS: "eur",
     *     ERDAT: "20231215"
     * };
     *
     * processor.processRecord(record).then(function(results) {
     *     var summary = processor.getSummary(results);
     *     console.log("Valid:", summary.isValid);
     * });
     * ```
     *
     * ## Extension Points
     *
     * - Add new field definition: processor.registerFieldDef(new FieldDef({...}))
     * - Add new whitelist: processor.registerWhitelist("KEY", new Set([...]))
     * - Add new type handler: Extend Normalizers.js and Validators.js
     */

    return {
        // Main processor class
        FieldProcessor: FieldProcessor.FieldProcessor,

        // Data models
        FieldDef: FieldModels.FieldDef,
        ValidationIssue: FieldModels.ValidationIssue,
        FieldResult: FieldModels.FieldResult,

        // Enums and constants
        FieldTypeCategory: FieldTypes.FieldTypeCategory,
        Severity: FieldTypes.Severity,
        WhitelistSource: FieldTypes.WhitelistSource,
        ProcurementType: FieldTypes.ProcurementType,
        SAPBoolean: FieldTypes.SAPBoolean,
        FIELD_DEPENDENCIES: FieldTypes.FIELD_DEPENDENCIES,
        EN13556_SAMPLE_CODES: FieldTypes.EN13556_SAMPLE_CODES,

        // Cache management
        WhitelistCache: WhitelistCache.WhitelistCache,
        getGlobalCache: WhitelistCache.getGlobalCache,

        // Whitelist loading
        WhitelistLoader: WhitelistLoader.WhitelistLoader,

        // Normalizer functions
        Normalizers: Normalizers,

        // Validator functions
        Validators: Validators,

        // Version info
        VERSION: "1.0.0"
    };
});
