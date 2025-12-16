sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/View"
], function (Controller,
	JSONModel,
	View) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.Configurator", {

        onInit: function () {
            // Initial setup if needed
        },

        onSelectRegulation: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext(); // default model
            var sPath = oContext.getPath();
            console.log("Selected Regulation Path:", sPath);

            var oRulesTable = this.byId("rulesTable");
            console.log("Rules Table:", oRulesTable);

            oRulesTable.bindItems({ 
                path: sPath + "/to_Fields",
                template: oRulesTable.getItems()[0].clone()  // Clone first item as template
             });

            this.byId("detailPanel").setVisible(true)
        },
        
        onPressAddRegulation: function (oEvent) {
            // Logic to add a new regulation
        },

        onPressAddRule: function (oEvent) {
            // Logic to add a new rule
        },

        onPressSaveConfiguration: function (oEvent) {
            // Logic to save a configuraytion
        },

        onPressStartReadinessCheck: function (oEvent) {
            // Logic to test results
            var oRulesTable = this.byId("rulesTable");
            var aContexts = oRulesTable.getBinding('items').getContexts();

            var aData = aContexts.map(function(oContext) {
                return oContext.getObject();
            });

            var aReportResults = [];
            var aReadPromises = [];

            var oModel = this.getView().getModel();

            aData.forEach(function (oRule, iIndex) {

                var oPromise = new Promise(function (resolve) {

                    oModel.read("/" + oRule.Viewname, {
                        urlParameters: {
                            "$select": oRule.Elementname
                        },

                        success: function (oData) {

                            var bHasEmpty = oData.results.some(function (oRow) {
                                return !oRow[oRule.Elementname];
                            });

                            aReportResults.push({
                                category: oRule.Category || "GENERAL",
                                object_id: oRule.Viewname,
                                object_name: oRule.Elementname,
                                avail_cat: bHasEmpty ? "MISSING" : "AVAILABLE",
                                data_quality: bHasEmpty ? "LOW" : "HIGH",
                                gap_desc: bHasEmpty
                                    ? "Missing values detected"
                                    : "",
                                recommendation: bHasEmpty
                                    ? "Maintain missing values"
                                    : "",
                                data_source: oRule.Viewname
                            });

                            resolve();
                        },

                        error: function (oError) {

                            // Parse HTTP status
                            var iStatus = oError?.statusCode ||
                                        oError?.response?.statusCode;

                            if (iStatus === '404') {

                                // Treat as missing data
                                aReportResults.push({
                                    category: oRule.Category || "GENERAL",
                                    object_id: oRule.Viewname,
                                    object_name: oRule.Elementname,
                                    avail_cat: "MISSING",
                                    data_quality: "UNKNOWN",
                                    gap_desc: "Entity or data not found (404)",
                                    recommendation: "Check CDS view or data availability",
                                    data_source: oRule.Viewname
                                });

                                resolve(); // IMPORTANT: do not reject
                            } else {
                                // Real technical error
                                console.error("Read error", oError);
                                resolve(); // or reject(oError) if you want to stop
                            }
                        }
                    });
                });

                aReadPromises.push(oPromise);
            });

            Promise.all(aReadPromises).then(function () {

                console.log("All readiness checks completed");
                console.log(aReportResults);

                // Now create report
                this._createReport(aReportResults);

            }.bind(this)).catch(function (oError) {
                console.log("Readiness check failed");
            });
        },

        _createReport: function (aResults) {

            var oModel = this.getView().getModel();

            var oRegulationList = this.byId("regulationList");
            var oSelectedRegulation = oRegulationList.getSelectedItem().getBindingContext().getObject();
            console.log("Selected Regulation for Report:", oSelectedRegulation);

            var oParentPayload = {
                regulation: oSelectedRegulation.Id,
                run_timestamp: new Date().toISOString(),
                degree_fulfill: this._calculateDegree(aResults),
                data_avail_sum: `${aResults.length} checks executed`,
                status: "COMPLETED",
                to_Results: aResults
            };

            console.log("Creating parent report with payload:", oParentPayload);

            oModel.create("/Report", oParentPayload, {
                success: function(oParentSuccess) {
                    var sReportId = oParentSuccess.report_id;
                    console.log("Parent report created, ReportId:", sReportId);

                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("ComplianceReport");
                }.bind(this),
                error: function(oError) {
                    console.error("Failed to create report:", oError);
                }
            });
        },

        _calculateDegree: function (aResults) {
            var iOk = aResults.filter(r => r.avail_cat === "AVAILABLE").length;
            return Math.round((iOk / aResults.length) * 100);
        },

    });
});
