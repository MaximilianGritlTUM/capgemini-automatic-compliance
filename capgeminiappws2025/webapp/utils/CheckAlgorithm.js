sap.ui.define([
	"sap/ui/base/ManagedObject",
	"./nonstandard/FieldProcessor"
], function(
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
            return this._fieldProcessor.preloadWhitelists().then(function() {
                console.log("Whitelists preloaded for field validation");
                return self._executeRuleChecks(aData, oModel, oSelectedRegulation);
            }).catch(function(oError) {
                // If whitelist loading fails, continue without validation
                console.warn("Whitelist preload failed, continuing without validation:", oError);
                return self._executeRuleChecks(aData, oModel, oSelectedRegulation);
            });
        },

        /**
         * Executes the rule checks after whitelists are loaded.
         * @private
         */
        _executeRuleChecks: function(aData, oModel, oSelectedRegulation) {
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
                                .catch(function() { resolve(); }); // Continue even if validation fails
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
         * Processes results from an OData read and validates non-standard fields.
         * @private
         */
        _processRuleResults: function(oRule, aRows, aReportResults) {
            var self = this;
            var sFieldName = oRule.Elementname;

            // Check for empty values
            var bHasEmpty = aRows.some(function (oRow) {
                return !oRow[sFieldName];
            });

            // Validate non-standard fields if processor is available
            if (this._fieldProcessor && this._fieldProcessor.getFieldDef(sFieldName)) {
                // Collect validation results for all rows
                var aValidationPromises = aRows.map(function(oRow) {
                    return self._fieldProcessor.validateValue(sFieldName, oRow[sFieldName]);
                });

                return Promise.all(aValidationPromises).then(function(aValidationResults) {
                    // Aggregate validation status
                    var aErrors = [];
                    var aWarnings = [];
                    var iInvalid = 0;

                    aValidationResults.forEach(function(result) {
                        if (!result.ok) {
                            iInvalid++;
                        }
                        result.getErrors().forEach(function(err) {
                            if (aErrors.indexOf(err.message) === -1) {
                                aErrors.push(err.message);
                            }
                        });
                        result.getWarnings().forEach(function(warn) {
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
                    aErrors.forEach(function(err) {
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
            console.log("Selected Regulation for Report:", oSelectedRegulation);

            // Calculate validation statistics
            var oValidationStats = this._calculateValidationStats(aResults);

            // Build summary string (keep short due to backend field length limit)
            var sSummary = aResults.length + " checks";
            if (oValidationStats.invalid > 0 || oValidationStats.warnings > 0) {
                sSummary += " (" + oValidationStats.invalid + "err/" + oValidationStats.warnings + "warn)";
            }

            // Strip fields not supported by backend OData service
            // (validation_status and validation_errors are used internally but not persisted)
            var aCleanedResults = aResults.map(function(oResult) {
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
                to_Results: aCleanedResults
            };

            console.log("Creating parent report with payload:", oParentPayload);

            // Create the report entity in the backend
            return new Promise(function (resolve, reject) {
                oModel.create("/Report", oParentPayload, {
                    success: function(oParentSuccess) {
                        var sReportId = oParentSuccess.report_id;  // Extract the generated report ID
                        console.log("Parent report created, ReportId:", sReportId);
                        resolve(sReportId);  // Resolve with the report ID
                    },
                    error: function(oError) {
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
            var iOk = aResults.filter(function(r) {
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
        _calculateValidationStats: function(aResults) {
            var oStats = {
                valid: 0,
                invalid: 0,
                warnings: 0,
                notChecked: 0
            };

            aResults.forEach(function(r) {
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
        }

	});
});