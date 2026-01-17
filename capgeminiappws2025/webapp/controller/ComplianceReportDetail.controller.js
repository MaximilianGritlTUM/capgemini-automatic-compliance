sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, UIComponent, Spreadsheet, Filter, JSONModel) {
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
                    expand: "to_Results,to_BOMResults"
                }
            });

            // Filter materialsTable to show only category GENERAL
            var oMaterialsTable = this.byId("materialsTable");
            var oBinding = oMaterialsTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(new Filter("category", "EQ", "GENERAL"));
            }

            oModel.read(sPath + "/to_BOMResults", {
                urlParameters: {
                    "$expand": "to_Children"
                },
                success: function (oData) {

                    // 1. Normalize children arrays
                    oData.results.forEach(node => {
                        if (node.to_Children && node.to_Children.results) {
                            node.to_Children = node.to_Children.results;
                        } else {
                            node.to_Children = [];
                        }
                    });

                    // 2. Keep ONLY root nodes
                    const aRoots = oData.results.filter(function (item) {
                        return !item.parent_node_id;
                    });

                    console.log(aRoots)

                    const oJsonModel = new sap.ui.model.json.JSONModel(aRoots);
                    this.getView().setModel(oJsonModel, "bom");
                }.bind(this)
            });
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

                    aExportData.push({
                        Type: "Material",
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
        },

        onBomRowPress: function (oEvent) {
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();
            var oData = oContext.getObject();
            
            // Toggle expansion only for parent nodes
            if (oData.node_level === 0) {
                oData._expanded = !oData._expanded;
                oContext.getModel().refresh(true);
            }
        }
    });
});
