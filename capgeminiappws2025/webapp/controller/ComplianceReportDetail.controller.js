sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet"
], function (Controller, MessageToast, UIComponent, Spreadsheet) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.ComplianceReportDetail", {

        onInit: function () {
            // Get ReportId from Router and Bind here
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("ComplianceReportDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sReportId = oEvent.getParameter("arguments").reportId;

            var oModel = this.getView().getModel();
            var sPath = oModel.createKey("/Report",{
                report_id: sReportId
            });
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    expand: "to_Results"
                }
            })
        },

        onNavBack: function() {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("complianceReport", {}, true);
            }
        },

        //TODO: Not fully Implemented. After connecting to the backend, needed to be change
        onExportReport: function () {
            var oView = this.getView();

            // 1. Get the table from Material/Supplier

            var oMaterialsTable = oView.byId("materialsTable");
            var oSuppliersTable = oView.byId("suppliersTable");

            if(!oMaterialsTable && !oSuppliersTable) {
                MessageToast.show("No Tables found for export.");
                return; 
            }

            //2. Extract binded data from each tables
            var aExportData =[];
            if(oMaterialsTable) {
                oMaterialsTable.getItems().forEach(function(oItem) {
                    var oCtx = oItem.getBindingContext();
                    if(!oCtx) {
                        return;
                    }
                    var oObj = oCtx.getObject();

                    var sType = oObj.category || oObj.Category || oObj.object_type || oObj.objectType || "Material";
                    if (typeof sType === "string") {
                        var sTypeLower = sType.trim().toLowerCase();
                        if (sTypeLower === "product" || sTypeLower === "products" || sTypeLower === "material" || sTypeLower === "materials") {
                            sType = "Material";
                        }
                    }

                    aExportData.push({
                        Type: sType,
                        ObjectId: oObj.object_id,
                        ObjectName: oObj.object_name,
                        AvailabilityCategory: oObj.avail_cat,
                        DataQuality: oObj.data_quality,
                        GapDescription: oObj.gap_desc,
                        Recommendation: oObj.recommendation,
                        DataSource: oObj.data_source
                    });
                });
            }
            
             if (oSuppliersTable) {
                oSuppliersTable.getItems().forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext();
                    if (!oCtx) { return; }
                    var oObj = oCtx.getObject();

                    aExportData.push({
                        Type: "Supplier",
                        ObjectId: oObj.object_id,
                        ObjectName: oObj.object_name,
                        AvailabilityCategory: oObj.avail_cat,
                        DataQuality: oObj.data_quality,
                        GapDescription: oObj.gap_desc,
                        Recommendation: oObj.recommendation,
                        DataSource: oObj.data_source
                    });
                });
            }

            if (!aExportData.length) {
                MessageToast.show("No data available to export.");
                return;
            }

            // 3. Define Excel column
            var aCols = [
                { label: "Type",                 property: "Type",                 type: "string" },
                { label: "ID",                   property: "ObjectId",             type: "string" },
                { label: "Name",                 property: "ObjectName",           type: "string" },
                { label: "Availability",         property: "AvailabilityCategory", type: "string" },
                { label: "Data Quality",         property: "DataQuality",          type: "string" },
                { label: "Data Gaps",            property: "GapDescription",       type: "string" },
                { label: "Recommendations",      property: "Recommendation",       type: "string" },
                { label: "Data Source",          property: "DataSource",           type: "string" }
            ];
            
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: aExportData,
                fileName: "ReadinessReport_Detail.xlsx",
                worker: true
            };

            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    MessageToast.show("Report exported successfully.");
                })
                .finally(function () {
                    oSheet.destroy();
                });
        }
    });
});
