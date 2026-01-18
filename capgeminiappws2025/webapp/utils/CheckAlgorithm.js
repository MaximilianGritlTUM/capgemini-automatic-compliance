sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	/**
	 * Utility class for performing compliance checking algorithms.
	 * Handles data validation against configured rules and generates compliance reports.
	 */
	return ManagedObject.extend("capgeminiappws2025.utils.CheckAlgorithm", {

		/**
		 * Performs the compliance checking algorithm by validating data against a set of rules.
		 * For each rule, it checks if the specified element in the CDS view has data.
		 * Collects results and creates a compliance report.
		 *
		 * @param {Array} aData - Array of rule objects containing Viewname, Elementname, Category, etc.
		 * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model for backend communication
		 * @param {Object} oSelectedRegulation - The selected regulation object containing Id and other properties
		 * @returns {Promise} Promise that resolves when all checks are complete and report is created
		 */
        do_checking_algorithm: function (aData, oModel, oSelectedRegulation) {
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
                            // Check if any records have empty/null values for the specified element
                            var bHasEmpty = oData.results.some(function (oRow) {
                                return !oRow[oRule.Elementname];
                            });

                            // Create a result object based on whether missing data was found
                            aReportResults.push({
                                category: oRule.Category || "GENERAL",  // Rule category, default to GENERAL
                                object_id: oRule.Viewname,             // CDS view name
                                object_name: oRule.Elementname,        // Element/field name being checked
                                avail_cat: bHasEmpty ? "MISSING" : "AVAILABLE",  // Availability status
                                data_quality: bHasEmpty ? "LOW" : "HIGH",       // Quality assessment
                                gap_desc: bHasEmpty
                                    ? "Missing values detected"  // Description of the gap
                                    : "",                        // No gap if data is available
                                recommendation: bHasEmpty
                                    ? "Maintain missing values"  // Action needed
                                    : "",                        // No action needed
                                data_source: oRule.Viewname     // Source of the data
                            });

                            resolve();  // Resolve the promise for this rule check
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
                                    data_quality: "UNKNOWN",  // Can't determine quality if entity doesn't exist
                                    gap_desc: "Entity or data not found (404)",
                                    recommendation: "Check CDS view or data availability",
                                    data_source: oRule.Viewname
                                });

                                resolve(); // Resolve (don't reject) to continue with other checks
                            } else {
                                // For other technical errors (network, auth, etc.), log and continue
                                console.error("Read error", oError);
                                resolve(); // Resolve to avoid stopping the entire process
                            }
                        }
                    });
                });

                // Add this rule's promise to the array of all promises
                aReadPromises.push(oPromise);
            });

            // Additional check for BOM - Create ReportBOMResults from MaterialComposition data with multi-level hierarchy
            var oBomPromise = new Promise(function (resolve) {
                // Get active rules for Z_I_Materials
                var activeRules = aData.filter(function(rule) {
                    return rule.Viewname === "Z_I_Materials";
                });


                    // Then fetch all MaterialComposition records once
                    oModel.read("/MaterialComposition", {
                        urlParameters: { "$top": 10000,
                            "$expand": "to_ComponentMaterials,to_Material"
                         },
                        success: function(oCompData) {
                            var nodeIdCounter = 1;
                            var processedParents = {};
                            oCompData.results.forEach(function(comp) {
                                var parentMatId = comp.ParentMaterial;
                                var parentBomNumber = comp.BomNumber
                                var componentMatId = comp.ComponentMaterial;
                                
                                // Only create parent node once per unique bom number
                                if (!processedParents[parentBomNumber]) {
                                    
                                    var parentMaterial = comp.to_Material;
                                    var parentExists = !!parentMaterial;
                                    
                                    var parentHasAllData = parentExists && activeRules.every(function(rule) {
                                        return parentMaterial[rule.Elementname];
                                    });
                                    
                                    var parentGapDesc = "";
                                    if (!parentExists) {
                                        parentGapDesc = "ParentMaterial not found in master data";
                                    } else if (!parentHasAllData) {
                                        parentGapDesc = "ParentMaterial missing required fields";
                                    }
                                    
                                    // Assign node ID to this parent and track it
                                    var parentNodeId = nodeIdCounter++;

                                    processedParents[parentBomNumber] = parentNodeId;
                                    
                                    // Create parent result entry
                                    aReportResults.push({
                                        category: "BOM",
                                        node_id: parentNodeId,
                                        parent_node_id: null,
                                        parent_matnr: parentMatId,
                                        component_matnr: componentMatId,
                                        Plant: comp.Plant,
                                        BomUsage: comp.BomUsage,
                                        AltBom: comp.AltBom,
                                        bom_number: parentBomNumber,
                                        ItemNumber: comp.ItemNumber,
                                        avail_cat: parentHasAllData ? "AVAILABLE" : "MISSING",
                                        data_quality: parentHasAllData ? "HIGH" : "LOW",
                                        gap_desc: parentGapDesc,
                                        recommendation: parentHasAllData ? "" : "Ensure material exists with all required fields filled",
                                        data_source: "MaterialComposition"
                                    });
                                }
                                // create component nodes linked to their parents
                                
                                var componentMaterial = comp.to_ComponentMaterials.results[0];
    
                                var componentExists = !!componentMaterial;
                                
                                var componentHasAllData = componentExists && activeRules.every(function(rule) {
                                    return componentMaterial[rule.Elementname];
                                });
                                
                                var componentGapDesc = "";
                                if (!componentExists) {
                                    componentGapDesc = "ComponentMaterial not found in master data";
                                } else if (!componentHasAllData) {
                                    componentGapDesc = "ComponentMaterial missing required fields";
                                }
                                
                                var isAvailable = componentHasAllData;
                                var componentNodeId = nodeIdCounter++;
                                
                                // Create component result with parent_node_id linking to parent
                                aReportResults.push({
                                    category: "BOM",
                                    node_id: componentNodeId,
                                    parent_node_id: processedParents[parentBomNumber],
                                    parent_matnr: componentMatId,
                                    component_matnr: "",
                                    Plant: "",
                                    BomUsage: "",
                                    AltBom: "",
                                    bom_number: "",
                                    ItemNumber: "",
                                    avail_cat: isAvailable ? "AVAILABLE" : "MISSING",
                                    data_quality: isAvailable ? "HIGH" : "LOW",
                                    gap_desc: componentGapDesc,
                                    recommendation: isAvailable ? "" : "Ensure material exists with all required fields filled",
                                    data_source: "MaterialComposition"
                                });
                            });

                            resolve();
                        },
                        error: function(oError) {
                            console.error("Read error for MaterialComposition", oError);
                            resolve();
                        }
                    });
            });
            aReadPromises.push(oBomPromise);

            // Wait for all rule checks to complete, then create the report
            return Promise.all(aReadPromises).then(function () {
                // Create the compliance report with all collected results
                return this._createReport(aReportResults, oModel, oSelectedRegulation);

            }.bind(this)).catch(function (oError) {
                console.error("Readiness check failed:", oError);
                throw oError;  // Re-throw to propagate the error
            });
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
            
            aResults.forEach(function(result) {
                if (result.category === "BOM") {
                    aBomResults.push(result);
                } else {
                    aGeneralResults.push(result);
                }
            });

            // Filter general results to remove internal hierarchy properties not supported by backend
            var aFilteredGeneralResults = aGeneralResults.map(function(result) {
                return {
                    category: result.category,
                    object_id: result.object_id,
                    object_name: result.object_name,
                    avail_cat: result.avail_cat,
                    data_quality: result.data_quality,
                    gap_desc: result.gap_desc,
                    recommendation: result.recommendation,
                    data_source: result.data_source
                };
            });

            // Map BOM results to Z_I_ReportBOMResult structure
            var aFilteredBomResults = aBomResults.map(function(result) {
                return {
                    node_id: parseInt(result.node_id, 10),
                    parent_node_id: result.parent_node_id ? parseInt(result.parent_node_id, 10) : null,
                    parent_matnr: result.parent_matnr || "",
                    component_matnr: result.component_matnr || "",
                    Plant: result.Plant || "",
                    BomUsage: result.BomUsage || "",
                    AltBom: result.AltBom || "",
                    bom_number: result.bom_number || "",
                    ItemNumber: result.ItemNumber || "",
                    avail_cat: result.avail_cat,
                    data_quality: result.data_quality,
                    gap_desc: result.gap_desc,
                    recommendation: result.recommendation,
                    data_source: result.data_source
                };
            });

            // Prepare the payload for creating the parent report entity
            var oParentPayload = {
                regulation: oSelectedRegulation.Id,                    // Reference to the regulation
                run_timestamp: new Date().toISOString(),             // Timestamp of the check run
                degree_fulfill: this._calculateDegree(aResults),      // Percentage of successful checks
                data_avail_sum: `${aResults.length} checks executed`, // Summary of checks performed
                status: "COMPLETED",                                  // Report status
                to_Results: aFilteredGeneralResults,                  // Associated general result details
                to_BOMResults: aFilteredBomResults                    // Associated BOM result details
            };

            // Create the report entity in the backend
            return new Promise(function (resolve, reject) {
                oModel.create("/Report", oParentPayload, {
                    success: function(oParentSuccess) {
                        var sReportId = oParentSuccess.report_id;  // Extract the generated report ID
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
		 *
		 * @param {Array} aResults - Array of result objects
		 * @returns {number} Percentage of checks that passed (rounded to nearest integer)
		 * @private
		 */
        _calculateDegree: function (aResults) {
            // Count how many results have "AVAILABLE" status (successful checks)
            var iOk = aResults.filter(r => r.avail_cat === "AVAILABLE").length;
            // Calculate percentage and round to nearest integer
            return Math.round((iOk / aResults.length) * 100);
        },

	});
});