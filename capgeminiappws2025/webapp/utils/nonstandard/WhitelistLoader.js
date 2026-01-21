/**
 * WhitelistLoader.js
 *
 * Loaders for SAP whitelist data (T006 units, TCURC currencies, etc.)
 * These loaders fetch data from SAP OData services and cache them.
 *
 * @module utils/nonstandard/WhitelistLoader
 */
sap.ui.define([
    "./FieldTypes",
    "./WhitelistCache"
], function (FieldTypes, WhitelistCache) {
    "use strict";

    /**
     * WhitelistLoader - handles loading whitelist data from SAP
     *
     * @class WhitelistLoader
     * @param {sap.ui.model.odata.v2.ODataModel} oDataModel - OData model for SAP access
     * @param {WhitelistCache.WhitelistCache} [cache] - Optional cache instance
     */
    function WhitelistLoader(oDataModel, cache) {
        this._oDataModel = oDataModel;
        this._cache = cache || WhitelistCache.getGlobalCache();
        this._registerLoaders();
    }

    /**
     * Register loaders with the cache
     * @private
     */
    WhitelistLoader.prototype._registerLoaders = function () {
        var self = this;

        // T006 Units loader
        this._cache.registerLoader(FieldTypes.WhitelistSource.T006, function () {
            return self.loadUnitsFromT006();
        });

        // TCURC Currencies loader
        this._cache.registerLoader(FieldTypes.WhitelistSource.TCURC, function () {
            return self.loadCurrenciesFromTCURC();
        });

        // T134 Material Types loader
        this._cache.registerLoader(FieldTypes.WhitelistSource.T134, function () {
            return self.loadMaterialTypes();
        });
    };

    /**
     * Load material type codes from SAP table T134
     * Uses static list of standard SAP material types
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.loadMaterialTypes = function () {
        return Promise.resolve(FieldTypes.MATERIAL_TYPE_CODES);
    };

    /**
     * Get material types from cache, loading if necessary
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.getMaterialTypes = function () {
        return this._cache.getOrLoad(FieldTypes.WhitelistSource.T134);
    };

    /**
     * Check if a material type code is valid
     * @param {string} materialType - Material type code to check
     * @returns {Promise<boolean>}
     */
    WhitelistLoader.prototype.isValidMaterialType = function (materialType) {
        var normalized = String(materialType || "").toUpperCase().trim();
        return this.getMaterialTypes().then(function (types) {
            return types.has(normalized);
        });
    };

    /**
     * Load unit codes from SAP table T006
     * Note: T006Set is not available in Z_CONFIG_SRV_UI, using fallback data
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.loadUnitsFromT006 = function () {
        // T006Set not available in the current OData service (Z_CONFIG_SRV_UI)
        // Use fallback units directly to avoid unnecessary OData errors
        return Promise.resolve(this._getFallbackUnits());
    };

    /**
     * Load currency codes from SAP table TCURC
     * Note: TCURCSet is not available in Z_CONFIG_SRV_UI, using fallback data
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.loadCurrenciesFromTCURC = function () {
        // TCURCSet not available in the current OData service (Z_CONFIG_SRV_UI)
        // Use fallback currencies directly to avoid unnecessary OData errors
        return Promise.resolve(this._getFallbackCurrencies());
    };

    /**
     * Get fallback units of measure (common SAP units)
     * Used when SAP connection is unavailable
     * @private
     * @returns {Set<string>}
     */
    WhitelistLoader.prototype._getFallbackUnits = function () {
        return new Set([
            // Base units
            "EA", "PC", "ST", "LE", "AU",   // Each/Piece/Stück

            // Weight units
            "KG", "G", "MG", "T", "TO",     // Kilogram, Gram, Milligram, Ton
            "LB", "OZ", "GR",               // Pound, Ounce, Grain

            // Length units
            "M", "CM", "MM", "KM",          // Meter variants
            "IN", "FT", "YD", "MI",         // Imperial length

            // Volume units
            "L", "ML", "HL", "M3",          // Liter variants, Cubic meter
            "GAL", "QT", "PT", "FL",        // Gallon, Quart, Pint, Fluid

            // Area units
            "M2", "CM2", "MM2", "KM2",      // Square meter variants
            "HA", "AR",                      // Hectare, Are
            "FT2", "YD2", "AC",             // Square feet, yards, Acre

            // Time units
            "SEC", "MIN", "H", "D",         // Second, Minute, Hour, Day
            "WK", "MON", "YR",              // Week, Month, Year

            // Package units
            "CS", "PK", "BX", "CT",         // Case, Pack, Box, Carton
            "PAL", "DZ", "GRO",             // Pallet, Dozen, Gross
            "ROL", "SET", "KIT",            // Roll, Set, Kit

            // Quantity units
            "PR", "PAR", "KK", "TSD",       // Pair, Pair, Thousand

            // Energy units
            "KWH", "MWH", "J", "KJ",        // Kilowatt-hour, Megawatt-hour, Joule

            // Pressure/Force units
            "BAR", "PA", "KPA", "MPA",      // Bar, Pascal variants
            "PSI", "ATM",                   // PSI, Atmosphere

            // Temperature (special)
            "CEL", "FAH", "KEL"             // Celsius, Fahrenheit, Kelvin
        ]);
    };

    /**
     * Get fallback currency codes (ISO 4217)
     * Used when SAP connection is unavailable
     * @private
     * @returns {Set<string>}
     */
    WhitelistLoader.prototype._getFallbackCurrencies = function () {
        return new Set([
            // Major currencies
            "EUR", "USD", "GBP", "JPY", "CHF",
            "CNY", "HKD", "AUD", "CAD", "NZD",

            // European currencies
            "SEK", "NOK", "DKK", "PLN", "CZK",
            "HUF", "RON", "BGN", "HRK", "ISK",
            "RUB", "UAH", "TRY",

            // Asian currencies
            "INR", "KRW", "TWD", "SGD", "MYR",
            "THB", "IDR", "PHP", "VND", "PKR",
            "BDT", "LKR",

            // Middle East / Africa
            "AED", "SAR", "QAR", "KWD", "BHD",
            "OMR", "EGP", "ZAR", "NGN", "KES",
            "MAD", "ILS",

            // Americas
            "MXN", "BRL", "ARS", "CLP", "COP",
            "PEN", "VES",

            // Oceania
            "FJD",

            // Special currencies
            "XAU", "XAG", "XPT", "XPD",     // Precious metals
            "XDR"                            // Special Drawing Rights
        ]);
    };

    /**
     * Load EN 13556 timber codes from configuration
     * @param {string} [configPath] - Optional path to config file
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.loadEN13556Codes = function (configPath) {
        // For now, use the static codes from FieldTypes
        // In production, this could load from a config file or database
        return Promise.resolve(FieldTypes.EN13556_SAMPLE_CODES);
    };

    /**
     * Load custom whitelist from configuration
     * @param {string} whitelistKey - Key identifying the whitelist
     * @param {Array<string>|Object} configData - Configuration data
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.loadCustomWhitelist = function (whitelistKey, configData) {
        var values;

        if (Array.isArray(configData)) {
            values = configData;
        } else if (configData && configData.values) {
            values = configData.values;
        } else {
            return Promise.reject(new Error("Invalid configuration data for whitelist: " + whitelistKey));
        }

        var normalized = values.map(function (v) {
            return String(v).toUpperCase().trim();
        });

        return Promise.resolve(new Set(normalized));
    };

    /**
     * Get units from cache, loading if necessary
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.getUnits = function () {
        return this._cache.getOrLoad(FieldTypes.WhitelistSource.T006);
    };

    /**
     * Get currencies from cache, loading if necessary
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.getCurrencies = function () {
        return this._cache.getOrLoad(FieldTypes.WhitelistSource.TCURC);
    };

    /**
     * Get EN 13556 timber codes from cache
     * @returns {Promise<Set<string>>}
     */
    WhitelistLoader.prototype.getTimberCodes = function () {
        return this._cache.getOrLoad(FieldTypes.WhitelistSource.EN13556);
    };

    /**
     * Check if a unit code is valid
     * @param {string} unitCode - Unit code to check
     * @returns {Promise<boolean>}
     */
    WhitelistLoader.prototype.isValidUnit = function (unitCode) {
        var normalized = String(unitCode || "").toUpperCase().trim();
        return this.getUnits().then(function (units) {
            return units.has(normalized);
        });
    };

    /**
     * Check if a currency code is valid
     * @param {string} currencyCode - Currency code to check
     * @returns {Promise<boolean>}
     */
    WhitelistLoader.prototype.isValidCurrency = function (currencyCode) {
        var normalized = String(currencyCode || "").toUpperCase().trim();
        return this.getCurrencies().then(function (currencies) {
            return currencies.has(normalized);
        });
    };

    /**
     * Check if a timber code is valid
     * @param {string} timberCode - Timber code to check
     * @returns {Promise<boolean>}
     */
    WhitelistLoader.prototype.isValidTimberCode = function (timberCode) {
        var normalized = String(timberCode || "").toUpperCase().trim();
        return this.getTimberCodes().then(function (codes) {
            return codes.has(normalized);
        });
    };

    /**
     * Preload all whitelists
     * @returns {Promise<Object>} - Object with all loaded whitelists
     */
    WhitelistLoader.prototype.preloadAll = function () {
        var self = this;
        return Promise.all([
            this.getUnits(),
            this.getCurrencies(),
            this.getTimberCodes(),
            this.getMaterialTypes()
        ]).then(function (results) {
            return {
                units: results[0],
                currencies: results[1],
                timberCodes: results[2],
                materialTypes: results[3]
            };
        });
    };

    /**
     * Refresh all cached whitelists
     * @returns {Promise<Object>}
     */
    WhitelistLoader.prototype.refreshAll = function () {
        this._cache.remove(FieldTypes.WhitelistSource.T006);
        this._cache.remove(FieldTypes.WhitelistSource.TCURC);
        this._cache.remove(FieldTypes.WhitelistSource.EN13556);
        this._cache.remove(FieldTypes.WhitelistSource.T134);
        return this.preloadAll();
    };

    // =========================================================================
    // Static factory and utility methods
    // =========================================================================

    /**
     * Create a loader with optional OData model
     * @static
     * @param {sap.ui.model.odata.v2.ODataModel} [oDataModel] - Optional OData model
     * @returns {WhitelistLoader}
     */
    WhitelistLoader.create = function (oDataModel) {
        return new WhitelistLoader(oDataModel);
    };

    /**
     * Create a loader that uses only fallback data (no SAP connection)
     * Useful for testing or offline scenarios
     * @static
     * @returns {WhitelistLoader}
     */
    WhitelistLoader.createOffline = function () {
        return new WhitelistLoader(null);
    };

    // =========================================================================

    return {
        WhitelistLoader: WhitelistLoader
    };
});
