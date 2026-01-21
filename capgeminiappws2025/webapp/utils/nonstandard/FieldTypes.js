/**
 * FieldTypes.js
 *
 * Enums and constants for Non-Standard SAP Field Handling.
 * Defines field type categories, severity levels, and domain-specific enums.
 *
 * @module utils/nonstandard/FieldTypes
 */
sap.ui.define([], function () {
    "use strict";

    /**
     * Field type categories for SAP non-standard fields
     * @readonly
     * @enum {string}
     */
    var FieldTypeCategory = Object.freeze({
        /** Unit of measure fields (T006-backed) */
        UNIT: "UNIT",
        /** Currency key fields (TCURC-backed) */
        CURRENCY: "CURRENCY",
        /** Quantity fields requiring unit dependency */
        QUAN: "QUAN",
        /** Amount/currency fields requiring currency key dependency */
        CURR: "CURR",
        /** Date fields (DATS format) */
        DATS: "DATS",
        /** Domain/code fields with fixed value set */
        DOMAIN: "DOMAIN",
        /** Boolean indicator fields (X/blank) */
        BOOLEAN: "BOOLEAN",
        /** Array of string codes (e.g., timber codes) */
        CODE_ARRAY: "CODE_ARRAY",
        /** Character fields with format/length validation (customer-specific) */
        CHAR: "CHAR"
    });

    /**
     * Validation issue severity levels
     * @readonly
     * @enum {string}
     */
    var Severity = Object.freeze({
        /** Validation error - field is invalid */
        ERROR: "ERROR",
        /** Warning - field may have issues */
        WARN: "WARN",
        /** Informational message */
        INFO: "INFO"
    });

    /**
     * Whitelist source types
     * @readonly
     * @enum {string}
     */
    var WhitelistSource = Object.freeze({
        /** SAP table T006 (units of measure) */
        T006: "T006",
        /** SAP table TCURC (currency codes) */
        TCURC: "TCURC",
        /** SAP table T134 (material types) */
        T134: "T134",
        /** EN 13556 timber species codes */
        EN13556: "EN13556",
        /** Hardcoded/static enum values */
        STATIC: "STATIC",
        /** Custom configuration file */
        CONFIG: "CONFIG"
    });

    /**
     * Procurement Type (BESKZ) domain values
     * @readonly
     * @enum {string}
     */
    var ProcurementType = Object.freeze({
        /** In-house production */
        IN_HOUSE: "E",
        /** External procurement */
        EXTERNAL: "F",
        /** Both in-house and external */
        BOTH: "X",
        /** None/blank */
        NONE: ""
    });

    /**
     * Valid procurement type values as Set for quick lookup
     * @type {Set<string>}
     */
    var PROCUREMENT_TYPE_VALUES = new Set(["E", "F", "X", ""]);

    /**
     * Boolean indicator values - truthy inputs
     * @type {Set<string>}
     */
    var BOOLEAN_TRUTHY = new Set(["x", "X", "true", "TRUE", "1", "yes", "YES", "y", "Y"]);

    /**
     * Boolean indicator values - falsy inputs
     * @type {Set<string>}
     */
    var BOOLEAN_FALSY = new Set(["", " ", "false", "FALSE", "0", "no", "NO", "n", "N"]);

    /**
     * SAP Boolean indicator normalized values
     * @readonly
     * @enum {string}
     */
    var SAPBoolean = Object.freeze({
        TRUE: "X",
        FALSE: ""
    });

    /**
     * Common SAP field names and their dependencies
     * Maps quantity/amount fields to their required unit/currency fields
     * @type {Object<string, string>}
     */
    var FIELD_DEPENDENCIES = Object.freeze({
        // Quantity fields -> Unit fields
        "MENGE": "MEINS",      // Order quantity -> Base unit of measure
        "NTGEW": "GEWEI",      // Net weight -> Weight unit
        "BRGEW": "GEWEI",      // Gross weight -> Weight unit
        "VOLUM": "VOLEH",      // Volume -> Volume unit
        "GROES": "MEINS",      // Size -> Unit of measure
        "UMREZ": "MEINS",      // Numerator -> Unit of measure
        "UMREN": "MEINS",      // Denominator -> Unit of measure
        "LAENG": "MEINS",      // Length -> Unit of measure
        "BREIT": "MEINS",      // Width -> Unit of measure
        "HOEHE": "MEINS",      // Height -> Unit of measure

        // Amount fields -> Currency fields
        "NETWR": "WAERS",      // Net value -> Currency key
        "MWSBP": "WAERS",      // Tax amount -> Currency key
        "KZWI1": "WAERS",      // Subtotal 1 -> Currency key
        "KZWI2": "WAERS",      // Subtotal 2 -> Currency key
        "KZWI3": "WAERS",      // Subtotal 3 -> Currency key
        "KZWI4": "WAERS",      // Subtotal 4 -> Currency key
        "KZWI5": "WAERS",      // Subtotal 5 -> Currency key
        "KZWI6": "WAERS",      // Subtotal 6 -> Currency key
        "WAVWR": "WAERS",      // Cost of goods sold -> Currency key
        "CMPRE": "WAERS",      // Credit price -> Currency key
        "KBETR": "WAERS"       // Rate (condition) -> Currency key
    });

    /**
     * EN 13556 Timber species codes (sample set)
     * Full list should be loaded from configuration
     * @type {Set<string>}
     */
    var EN13556_SAMPLE_CODES = new Set([
        // Common European species
        "ABAL",  // Abies alba (European Silver Fir)
        "ACPS",  // Acer pseudoplatanus (Sycamore)
        "ACPL",  // Acer platanoides (Norway Maple)
        "ALGL",  // Alnus glutinosa (Common Alder)
        "BEPE",  // Betula pendula (Silver Birch)
        "CABE",  // Carpinus betulus (European Hornbeam)
        "CASA",  // Castanea sativa (Sweet Chestnut)
        "FASY",  // Fagus sylvatica (European Beech)
        "FXEX",  // Fraxinus excelsior (European Ash)
        "PCAB",  // Picea abies (Norway Spruce)
        "PISY",  // Pinus sylvestris (Scots Pine)
        "PNNI",  // Pinus nigra (Black Pine)
        "PRAV",  // Prunus avium (Wild Cherry)
        "QURO",  // Quercus robur (Pedunculate Oak)
        "QUPE",  // Quercus petraea (Sessile Oak)
        "ROPS",  // Robinia pseudoacacia (Black Locust)
        "TICO",  // Tilia cordata (Small-leaved Lime)
        "ULGL",  // Ulmus glabra (Wych Elm)

        // Tropical species
        "SWMA",  // Swietenia macrophylla (Mahogany)
        "TGRD",  // Tectona grandis (Teak)
        "KHSE",  // Khaya senegalensis (African Mahogany)
        "DINI",  // Dalbergia nigra (Brazilian Rosewood)
        "DALA",  // Dalbergia latifolia (Indian Rosewood)
        "PTSN",  // Pterocarpus santalinus (Red Sanders)
        "GOCE",  // Gonystylus spp. (Ramin)
        "DISP",  // Diospyros spp. (Ebony)
        "PLEL",  // Pericopsis elata (Afrormosia)
        "MICA",  // Microberlinia spp. (Zebrawood)
        "EUCY",  // Eucalyptus spp.

        // North American species
        "QURU",  // Quercus rubra (Red Oak)
        "QUAL",  // Quercus alba (White Oak)
        "JUVI",  // Juglans nigra (Black Walnut)
        "PRVI",  // Prunus serotina (Black Cherry)
        "ACSA",  // Acer saccharum (Sugar Maple)
        "FRSP",  // Fraxinus spp. (American Ash)
        "LITU",  // Liriodendron tulipifera (Tulipwood)
        "TSHE",  // Tsuga heterophylla (Western Hemlock)
        "PSME",  // Pseudotsuga menziesii (Douglas Fir)
        "THPL"   // Thuja plicata (Western Red Cedar)
    ]);

    /**
     * SAP Material Types (T134 - Materialart)
     * Standard SAP material type codes
     * @type {Set<string>}
     */
    var MATERIAL_TYPE_CODES = new Set([
        "ROH",   // Raw materials
        "HALB",  // Semifinished products
        "FERT",  // Finished products
        "HAWA",  // Trading goods
        "DIEN",  // Services
        "ERSA",  // Spare parts
        "HIBE",  // Operating supplies/consumables
        "NLAG",  // Non-stock materials
        "UNBW",  // Non-valuated materials
        "VERP",  // Packaging materials
        "LEIH",  // Returnable packaging
        "FHMI",  // Production resources/tools
        "CONT",  // Kanban container
        "PIPE",  // Pipeline material
        "PROD",  // Product groups
        "HERS",  // Manufacturer parts
        "KMAT",  // Configurable material
        "VKHM",  // Additionals
        "WERB",  // Advertising materials
        "MODE",  // Apparel
        "FGTR",  // Beverages (finished goods)
        "WETT",  // Competitive products
        "LEER",  // Empties
        "LGUT",  // Empties (alternative)
        "FOOD",  // Foods
        "VOLL",  // Full products
        "INTR",  // Intra materials
        "IBAU",  // Maintenance assemblies
        "NOF1",  // Non-foods
        "FRIP",  // Perishables
        "PROC",  // Process materials
        "WERT"   // Value-only materials
    ]);

    /**
     * Date format patterns for parsing
     * @type {Array<{pattern: RegExp, groups: Array<string>}>}
     */
    var DATE_PATTERNS = [
        // YYYYMMDD (SAP DATS format)
        {
            pattern: /^(\d{4})(\d{2})(\d{2})$/,
            groups: ["year", "month", "day"]
        },
        // YYYY-MM-DD (ISO format)
        {
            pattern: /^(\d{4})-(\d{2})-(\d{2})$/,
            groups: ["year", "month", "day"]
        },
        // DD.MM.YYYY (European format)
        {
            pattern: /^(\d{2})\.(\d{2})\.(\d{4})$/,
            groups: ["day", "month", "year"]
        },
        // DD/MM/YYYY (European format with slash)
        {
            pattern: /^(\d{2})\/(\d{2})\/(\d{4})$/,
            groups: ["day", "month", "year"]
        },
        // MM/DD/YYYY (US format)
        {
            pattern: /^(\d{2})\/(\d{2})\/(\d{4})$/,
            groups: ["month", "day", "year"],
            isUS: true  // Flag for disambiguation
        }
    ];

    return {
        FieldTypeCategory: FieldTypeCategory,
        Severity: Severity,
        WhitelistSource: WhitelistSource,
        ProcurementType: ProcurementType,
        PROCUREMENT_TYPE_VALUES: PROCUREMENT_TYPE_VALUES,
        BOOLEAN_TRUTHY: BOOLEAN_TRUTHY,
        BOOLEAN_FALSY: BOOLEAN_FALSY,
        SAPBoolean: SAPBoolean,
        FIELD_DEPENDENCIES: FIELD_DEPENDENCIES,
        EN13556_SAMPLE_CODES: EN13556_SAMPLE_CODES,
        MATERIAL_TYPE_CODES: MATERIAL_TYPE_CODES,
        DATE_PATTERNS: DATE_PATTERNS
    };
});
