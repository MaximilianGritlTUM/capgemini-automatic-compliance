sap.ui.define([
    "sap/ui/base/ManagedObject",
    "./nonstandard/FieldProcessor"
], function (
    ManagedObject,
    FieldProcessor
) {
    "use strict";

    /**
     * Utility class for performing compliance checking algorithms.
     * Handles data validation against configured rules and generates compliance reports.
     */
    return ManagedObject.extend("capgeminiappws2025.utils.CheckAlgorithm", {

        /**
         * Performs the compliance checking algorithm by validating data against a set of rules.
         * For each rule, it checks if the specified element in the CDS view has data and validates
         * non-standard fields against SAP whitelists (T006 units, TCURC currencies, etc.).
         *
         * @param {Array} aData - Array of rule objects containing Viewname, Elementname, Category, etc.
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model for backend communication
         * @param {Object} oSelectedRegulation - The selected regulation object containing Id and other properties
         * @returns {Promise} Promise that resolves when all checks are complete and report is created
         */
        do_checking_algorithm: function (aData, oModel, oSelectedRegulation) {
            var self = this;

            // Initialize the FieldProcessor for non-standard field validation
            this._fieldProcessor = FieldProcessor.FieldProcessor.create(oModel);

            // Preload whitelists (T006, TCURC, etc.) before processing
            return this._fieldProcessor.preloadWhitelists().then(function () {
                console.log("Whitelists preloaded for field validation");
                return self._executeRuleChecks(aData, oModel, oSelectedRegulation);
            }).catch(function (oError) {
                // If whitelist loading fails, continue without validation
                console.warn("Whitelist preload failed, continuing without validation:", oError);
                return self._executeRuleChecks(aData, oModel, oSelectedRegulation);
            });
        },

        /**
         * Executes the rule checks after whitelists are loaded.
         * @private
         */
        _executeRuleChecks: function (aData, oModel, oSelectedRegulation) {
            var self = this;
            // Array to store the results of each rule check
            var aReportResults = [];
            // Array to collect promises for each asynchronous data read operation
            var aReadPromises = [];

            // Iterate through each rule to perform data availability checks
            aData.forEach(function (oRule, iIndex) {

                // Create a promise for each rule check to handle asynchronous OData read
                var oPromise = new Promise(function (resolve) {

                    // Perform OData read on the CDS view specified in the rule
                    // Select only the specific element to check for data availability
                    oModel.read("/" + oRule.Viewname, {
                        urlParameters: {
                            "$select": oRule.Elementname
                        },

                        success: function (oData) {
                            // Validate and analyze the results
                            self._processRuleResults(oRule, oData.results, aReportResults)
                                .then(resolve)
                                .catch(function () { resolve(); }); // Continue even if validation fails
                        },

                        error: function (oError) {
                            // Extract HTTP status code from the error object
                            var iStatus = oError?.statusCode ||
                                oError?.response?.statusCode;

                            if (iStatus === '404') {
                                // If the CDS view/entity doesn't exist (404), treat as missing data
                                aReportResults.push({
                                    category: oRule.Category || "GENERAL",
                                    object_id: oRule.Viewname,
                                    object_name: oRule.Elementname,
                                    avail_cat: "MISSING",
                                    data_quality: "UNKNOWN",
                                    validation_status: "UNKNOWN",
                                    validation_errors: [],
                                    gap_desc: "Entity or data not found (404)",
                                    recommendation: "Check CDS view or data availability",
                                    data_source: oRule.Viewname
                                });

                                resolve();
                            } else {
                                console.error("Read error", oError);
                                resolve();
                            }
                        }
                    });
                });

                aReadPromises.push(oPromise);
            });

            // Additional check for BOM - Create ReportBOMResults from MaterialComposition data with multi-level hierarchy
            var oBomPromise = this._checkBOMReadiness(aData, oModel, aReportResults);
            aReadPromises.push(oBomPromise);

            // Wait for all rule checks to complete, then create the report
            return Promise.all(aReadPromises).then(function () {
                console.log("All readiness checks completed");
                console.log(aReportResults);

                return self._createReport(aReportResults, oModel, oSelectedRegulation);

            }).catch(function (oError) {
                console.log("Readiness check failed");
                throw oError;
            });
        },

        /**
         * Performs readiness checks for BOM (Bill of Materials) structures.
         * Fetches material composition data and validates both parent and component materials.
         * 
         * @param {Array} aRules - The full list of rules (filtered internally for Z_I_Materials)
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model
         * @param {Array} aReportResults - The shared array to push results into
         * @returns {Promise} - Promise resolving when the BOM check is complete
         * @private
         */
        _checkBOMReadiness: function (aRules, oModel, aReportResults) {
            var self = this;

            return new Promise(function (resolve) {
                // Get active rules for Z_I_Materials to apply to BOM components
                var aMaterialRules = aRules.filter(function (rule) {
                    return rule.Viewname === "Z_I_Materials";
                });

                // Fetch all MaterialComposition records with expanded details
                oModel.read("/MaterialComposition", {
                    urlParameters: {
                        "$top": 1000,
                        "$expand": "to_ComponentMaterials,to_Material"
                    },
                    success: function (oCompData) {
                        var iNodeIdCounter = 1;
                        var oProcessedParentPromises = {}; // Map BomNumber -> Promise resolving to Parent Result
                        var aAllPromises = [];

                        oCompData.results.forEach(function (oComp) {
                            var sParentBomNumber = oComp.BomNumber;
                            var sParentMatId = oComp.ParentMaterial;
                            var sComponentMatId = oComp.ComponentMaterial;

                            // 1. Process Parent (only once per BOM number)
                            if (!oProcessedParentPromises[sParentBomNumber]) {
                                var oParentMaterial = oComp.to_Material;
                                var iParentNodeId = iNodeIdCounter++;

                                // Evaluate parent quality asynchronously
                                var pParent = self._evaluateMaterialQuality(oParentMaterial, aMaterialRules)
                                    .then(function (oQuality) {
                                        var oParentResult = {
                                            category: "BOM",
                                            node_id: iParentNodeId,
                                            parent_node_id: null,
                                            parent_matnr: sParentMatId,
                                            component_matnr: sComponentMatId, // Represents the main item for this BOM context
                                            Plant: oComp.Plant,
                                            material_description: oParentMaterial ? oParentMaterial.MaterialDescription : "",
                                            plant_description: oParentMaterial ? oParentMaterial.PlantDescription : "",
                                            bom_usage: oComp.BomUsage,
                                            alt_bom: oComp.AltBom,
                                            bom_number: sParentBomNumber,
                                            ItemNumber: oComp.ItemNumber,
                                            avail_cat: oQuality.isAvailable ? "AVAILABLE" : "MISSING",
                                            data_quality: oQuality.data_quality,
                                            gap_desc: oQuality.gap_desc,
                                            recommendation: oQuality.recommendation,
                                            data_source: "MaterialComposition"
                                        };
                                        aReportResults.push(oParentResult);
                                        return oParentResult;
                                    });

                                oProcessedParentPromises[sParentBomNumber] = pParent;
                                aAllPromises.push(pParent);
                            }

                            // 2. Process Component (chained to parent to ensure we can update parent if needed)
                            var pComp = oProcessedParentPromises[sParentBomNumber].then(function (oParentResult) {
                                var oComponentMaterial = oComp.to_ComponentMaterials.results[0];

                                return self._evaluateMaterialQuality(oComponentMaterial, aMaterialRules)
                                    .then(function (oQuality) {
                                        var iComponentNodeId = iNodeIdCounter++;

                                        // Bubble up issues to parent if component is invalid
                                        if (!oQuality.isAvailable || oQuality.data_quality !== "HIGH") {
                                            oParentResult.avail_cat = "MISSING";
                                            // Propagate issue description to parent
                                            var sMissingMsg = "One of the child components has missing data availability or quality issues";
                                            if (oParentResult.gap_desc) {
                                                if (oParentResult.gap_desc.indexOf(sMissingMsg) === -1) {
                                                    oParentResult.gap_desc += "; " + sMissingMsg;
                                                }
                                            } else {
                                                oParentResult.gap_desc = sMissingMsg;
                                            }
                                            if (!oParentResult.recommendation) {
                                                oParentResult.recommendation = "Check child components for missing fields";
                                            }
                                        }

                                        // Add component result
                                        aReportResults.push({
                                            category: "BOM",
                                            node_id: iComponentNodeId,
                                            parent_node_id: oParentResult.node_id,
                                            parent_matnr: sComponentMatId,
                                            component_matnr: "",
                                            Plant: oComponentMaterial ? oComponentMaterial.BasicMaterial : "",
                                            material_description: oComponentMaterial ? oComponentMaterial.MaterialDescription : "",
                                            plant_description: oComponentMaterial ? oComponentMaterial.PlantDescription : "",
                                            bom_usage: "",
                                            alt_bom: "",
                                            bom_number: "",
                                            ItemNumber: "",
                                            avail_cat: oQuality.isAvailable ? "AVAILABLE" : "MISSING",
                                            data_quality: oQuality.data_quality,
                                            gap_desc: oQuality.gap_desc,
                                            recommendation: oQuality.recommendation,
                                            data_source: "MaterialComposition"
                                        });
                                    });
                            });
                            aAllPromises.push(pComp);
                        });

                        // Resolve when all parent and component checks are done
                        Promise.all(aAllPromises).then(resolve);
                    },
                    error: function (oError) {
                        console.error("Read error for MaterialComposition", oError);
                        resolve();
                    }
                });
            });
        },

        /**
         * Processes results from an OData read and validates non-standard fields.
         * @private
         */
        _processRuleResults: function (oRule, aRows, aReportResults) {
            var self = this;
            var sFieldName = oRule.Elementname;

            // Check for empty values
            var bHasEmpty = aRows.some(function (oRow) {
                return !oRow[sFieldName];
            });

            // Validate non-standard fields if processor is available
            if (this._fieldProcessor && this._fieldProcessor.getFieldDef(sFieldName)) {
                // Collect validation results for all rows
                var aValidationPromises = aRows.map(function (oRow) {
                    return self._fieldProcessor.validateValue(sFieldName, oRow[sFieldName]);
                });

                return Promise.all(aValidationPromises).then(function (aValidationResults) {
                    // Aggregate validation status
                    var aErrors = [];
                    var aWarnings = [];
                    var iInvalid = 0;

                    aValidationResults.forEach(function (result) {
                        if (!result.ok) {
                            iInvalid++;
                        }
                        result.getErrors().forEach(function (err) {
                            if (aErrors.indexOf(err.message) === -1) {
                                aErrors.push(err.message);
                            }
                        });
                        result.getWarnings().forEach(function (warn) {
                            if (aWarnings.indexOf(warn.message) === -1) {
                                aWarnings.push(warn.message);
                            }
                        });
                    });

                    // Determine validation status
                    var sValidationStatus = "VALID";
                    if (iInvalid > 0) {
                        sValidationStatus = "INVALID";
                    } else if (aWarnings.length > 0) {
                        sValidationStatus = "WARNINGS";
                    }

                    // Determine data quality based on validation
                    var sDataQuality = "HIGH";
                    if (bHasEmpty || sValidationStatus === "INVALID") {
                        sDataQuality = "LOW";
                    } else if (sValidationStatus === "WARNINGS") {
                        sDataQuality = "MEDIUM";
                    }

                    // Build gap description
                    var aGaps = [];
                    if (bHasEmpty) {
                        aGaps.push("Missing values detected");
                    }
                    if (iInvalid > 0) {
                        aGaps.push(iInvalid + " records with invalid values");
                    }
                    aErrors.forEach(function (err) {
                        aGaps.push(err);
                    });

                    // Build recommendation
                    var aRecommendations = [];
                    if (bHasEmpty) {
                        aRecommendations.push("Maintain missing values");
                    }
                    if (iInvalid > 0) {
                        aRecommendations.push("Fix invalid field values");
                    }

                    aReportResults.push({
                        category: oRule.Category || "GENERAL",
                        object_id: oRule.Viewname,
                        object_name: sFieldName,
                        avail_cat: bHasEmpty ? "MISSING" : "AVAILABLE",
                        data_quality: sDataQuality,
                        validation_status: sValidationStatus,
                        validation_errors: aErrors.concat(aWarnings),
                        gap_desc: aGaps.join("; "),
                        recommendation: aRecommendations.join("; "),
                        data_source: oRule.Viewname
                    });

                    return; // Ensure Promise chain resolves properly
                });
            } else {
                // No field definition - use simple empty check (original behavior)
                aReportResults.push({
                    category: oRule.Category || "GENERAL",
                    object_id: oRule.Viewname,
                    object_name: sFieldName,
                    avail_cat: bHasEmpty ? "MISSING" : "AVAILABLE",
                    data_quality: bHasEmpty ? "LOW" : "HIGH",
                    validation_status: "NOT_CHECKED",
                    validation_errors: [],
                    gap_desc: bHasEmpty ? "Missing values detected" : "",
                    recommendation: bHasEmpty ? "Maintain missing values" : "",
                    data_source: oRule.Viewname
                });

                return Promise.resolve();
            }
        },

        /**
         * Creates a compliance report in the backend with the collected check results.
         *
         * @param {Array} aResults - Array of result objects from the rule checks
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model for backend communication
         * @param {Object} oSelectedRegulation - The selected regulation object
         * @returns {Promise} Promise that resolves with the created report ID
         * @private
         */
        _createReport: function (aResults, oModel, oSelectedRegulation) {
            // Separate BOM results from regular results
            var aGeneralResults = [];
            var aBomResults = [];

            aResults.forEach(function (result) {
                if (result.category === "BOM") {
                    aBomResults.push(result);
                } else {
                    aGeneralResults.push(result);
                }
            });

            // Map BOM results to Z_I_ReportBOMResult structure
            var aFilteredBomResults = aBomResults.map(function (result) {
                return {
                    node_id: parseInt(result.node_id, 10),
                    parent_node_id: result.parent_node_id ? parseInt(result.parent_node_id, 10) : null,
                    parent_matnr: result.parent_matnr || "",
                    component_matnr: result.component_matnr || "",
                    Plant: result.Plant || "",
                    material_description: result.material_description || "",
                    plant_description: result.plant_description || "",
                    bom_usage: result.bom_usage || "",
                    alt_bom: result.alt_bom || "",
                    bom_number: result.bom_number || "",
                    ItemNumber: result.ItemNumber || "",
                    avail_cat: result.avail_cat,
                    data_quality: result.data_quality,
                    gap_desc: result.gap_desc,
                    recommendation: result.recommendation,
                    data_source: result.data_source
                };
            });

            // Calculate validation statistics
            var oValidationStats = this._calculateValidationStats(aResults);

            // Build summary string (keep short due to backend field length limit)
            var sSummary = aResults.length + " checks";
            if (oValidationStats.invalid > 0 || oValidationStats.warnings > 0) {
                sSummary += " (" + oValidationStats.invalid + "err/" + oValidationStats.warnings + "warn)";
            }

            // Strip fields not supported by backend OData service
            // (validation_status and validation_errors are used internally but not persisted)
            var aCleanedResults = aResults.map(function (oResult) {
                return {
                    category: oResult.category,
                    object_id: oResult.object_id,
                    object_name: oResult.object_name,
                    avail_cat: oResult.avail_cat,
                    data_quality: oResult.data_quality,
                    gap_desc: oResult.gap_desc,
                    recommendation: oResult.recommendation,
                    data_source: oResult.data_source
                };
            });

            // Prepare the payload for creating the parent report entity
            var oParentPayload = {
                regulation: oSelectedRegulation.Id,
                run_timestamp: new Date().toISOString(),
                degree_fulfill: this._calculateDegree(aResults),
                data_avail_sum: sSummary,
                status: "COMPLETED",
                to_Results: aCleanedResults,
                to_BOMResults: aFilteredBomResults
            };

            // Create the report entity in the backend
            return new Promise(function (resolve, reject) {
                oModel.create("/Report", oParentPayload, {
                    success: function (oParentSuccess) {
                        var sReportId = oParentSuccess.report_id;  // Extract the generated report ID
                        resolve(sReportId);  // Resolve with the report ID
                    },
                    error: function (oError) {
                        console.error("Failed to create report:", oError);
                        reject(oError);  // Reject with the error
                    }
                });
            });
        },

        /**
         * Calculates the degree of fulfillment as a percentage based on successful checks.
         * Considers both data availability and validation status.
         *
         * @param {Array} aResults - Array of result objects
         * @returns {number} Percentage of checks that passed (rounded to nearest integer)
         * @private
         */
        _calculateDegree: function (aResults) {
            // Count results that are both available AND valid
            var iOk = aResults.filter(function (r) {
                var bAvailable = r.avail_cat === "AVAILABLE";
                var bValid = r.validation_status !== "INVALID";
                return bAvailable && bValid;
            }).length;
            // Calculate percentage and round to nearest integer
            return Math.round((iOk / aResults.length) * 100);
        },

        /**
         * Calculates validation statistics from results.
         *
         * @param {Array} aResults - Array of result objects
         * @returns {Object} Stats object with valid, invalid, warnings, notChecked counts
         * @private
         */
        _calculateValidationStats: function (aResults) {
            var oStats = {
                valid: 0,
                invalid: 0,
                warnings: 0,
                notChecked: 0
            };

            aResults.forEach(function (r) {
                switch (r.validation_status) {
                    case "VALID":
                        oStats.valid++;
                        break;
                    case "INVALID":
                        oStats.invalid++;
                        break;
                    case "WARNINGS":
                        oStats.warnings++;
                        break;
                    default:
                        oStats.notChecked++;
                }
            });

            return oStats;
        },

        /**
         * Evaluates the data quality for a material against a set of rules.
         * Validates fields using FieldProcessor if available.
         * 
         * @param {Object} oMaterial - The material object
         * @param {Array} aRules - The list of rules to check
         * @returns {Promise<Object>} - Promise resolving to quality assessment {isAvailable, data_quality, gap_desc, recommendation}
         * @private
         */
        _evaluateMaterialQuality: function (oMaterial, aRules) {
            var self = this;
            if (!oMaterial) {
                return Promise.resolve({
                    isAvailable: false,
                    data_quality: "LOW",
                    gap_desc: "Material not found in master data",
                    recommendation: "Ensure material exists"
                });
            }

            // Create validation promises for all rules
            var aValidationPromises = aRules.map(function (rule) {
                var sFieldName = rule.Elementname;
                var vValue = oMaterial[sFieldName];

                // Basic existence check
                if (!vValue) {
                    return Promise.resolve({
                        field: sFieldName,
                        valid: false,
                        issue: "Missing value"
                    });
                }

                // FieldProcessor validation (if available and field is defined)
                if (self._fieldProcessor && self._fieldProcessor.getFieldDef(sFieldName)) {
                    return self._fieldProcessor.validateValue(sFieldName, vValue).then(function (result) {
                        return {
                            field: sFieldName,
                            valid: result.ok,
                            issue: result.ok ? null : result.getErrors().map(function (e) { return e.message; }).join("; ")
                        };
                    });
                } else {
                    // No field definition - just assume valid if it exists
                    return Promise.resolve({
                        field: sFieldName,
                        valid: true,
                        issue: null
                    });
                }
            });

            // Aggregate results
            return Promise.all(aValidationPromises).then(function (results) {
                var aMissing = results.filter(function (r) { return !r.valid && r.issue === "Missing value"; });
                var aInvalid = results.filter(function (r) { return !r.valid && r.issue !== "Missing value"; });

                var isAvailable = aMissing.length === 0;
                var data_quality = "HIGH";
                var gap_desc = "";
                var recommendation = "";

                if (aMissing.length > 0) {
                    data_quality = "LOW";
                    gap_desc = aMissing.map(function (r) { return r.field; }).join(", ");
                    recommendation = "Maintain missing values";
                }

                if (aInvalid.length > 0) {
                    // If we have invalid values, quality drops (unless it was already LOW due to missing)
                    if (data_quality === "HIGH") {
                        data_quality = "MEDIUM";
                    }

                    if (gap_desc) gap_desc += "; ";
                    gap_desc += "Invalid values: " + aInvalid.map(function (r) { return r.field + " (" + r.issue + ")"; }).join(", ");

                    if (recommendation) recommendation += "; ";
                    recommendation += "Fix invalid field values";
                }

                return {
                    isAvailable: isAvailable,
                    data_quality: data_quality,
                    gap_desc: gap_desc,
                    recommendation: recommendation
                };
            });
        }

    });
});