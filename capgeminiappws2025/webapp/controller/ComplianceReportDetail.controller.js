sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel",
    "capgeminiappws2025/utils/TransactionHistoryFilter"
], function (Controller, MessageToast, UIComponent, Spreadsheet, Filter, JSONModel, TransactionHistoryFilter) {
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

            // Load BOM results and enrich with activity status
            var that = this;
            Promise.all([
                new Promise(function (resolve) {
                    oModel.read(sPath + "/to_BOMResults", {
                        urlParameters: { "$expand": "to_Children" },
                        success: function (oData) { resolve(oData); },
                        error: function () { resolve({ results: [] }); }
                    });
                }),
                TransactionHistoryFilter.loadMaterialActivityStatus(oModel, 6).catch(function () {
                    return new Map();
                })
            ]).then(function (aRes) {
                var oData = aRes[0];
                var mActivityStatus = aRes[1];

                // 1. Normalize children arrays
                oData.results.forEach(function (node) {
                    if (node.to_Children && node.to_Children.results && node.to_Children.results.length > 0) {
                        node.to_Children = node.to_Children.results;
                        node.to_Children.forEach(function (child) {
                            child.to_Children = null;
                        });
                    } else {
                        node.to_Children = null;
                    }
                });

                // 2. Enrich with activity status
                oData.results.forEach(function (node) {
                    var oActivity = TransactionHistoryFilter.getActivityForMaterial(mActivityStatus, node.parent_matnr);
                    node.activity_status = oActivity.status;
                    node.last_transaction_date = oActivity.lastTransactionDate;
                    node.transaction_count = oActivity.transactionCount;
                    if (node.to_Children) {
                        node.to_Children.forEach(function (child) {
                            var oChildActivity = TransactionHistoryFilter.getActivityForMaterial(mActivityStatus, child.parent_matnr);
                            child.activity_status = oChildActivity.status;
                            child.last_transaction_date = oChildActivity.lastTransactionDate;
                            child.transaction_count = oChildActivity.transactionCount;
                        });
                    }
                });

                // 3. Keep ONLY root nodes
                var aRoots = oData.results.filter(function (item) {
                    return !item.parent_node_id;
                });

                // Store original BOM data for activity filtering
                that._aBomDataOriginal = JSON.parse(JSON.stringify(aRoots));

                var oJsonModel = new JSONModel(aRoots);
                that.getView().setModel(oJsonModel, "bom");
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
                { label: "Data Gaps / Activity", property: "GapDescription",       type: "string" },
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

        onActivityFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();

            // 1. Filter Fields tab (materialsTable) — OData filters
            var oMaterialsTable = this.byId("materialsTable");
            var oBinding = oMaterialsTable.getBinding("items");
            if (oBinding) {
                var aFilters = [new Filter("category", "EQ", "GENERAL")];
                if (sKey !== "ALL") {
                    aFilters.push(new Filter("activity_status", "EQ", sKey));
                }
                oBinding.filter(aFilters);
            }

            // 2. Filter BOM tab — client-side JSONModel filtering
            if (this._aBomDataOriginal) {
                var aFiltered;
                if (sKey === "ALL") {
                    aFiltered = JSON.parse(JSON.stringify(this._aBomDataOriginal));
                } else {
                    aFiltered = this._aBomDataOriginal.filter(function (oRoot) {
                        return oRoot.activity_status === sKey;
                    }).map(function (oRoot) {
                        var oCopy = JSON.parse(JSON.stringify(oRoot));
                        if (oCopy.to_Children && Array.isArray(oCopy.to_Children)) {
                            oCopy.to_Children = oCopy.to_Children.filter(function (oChild) {
                                return oChild.activity_status === sKey;
                            });
                        }
                        return oCopy;
                    });
                }
                this.getView().getModel("bom").setData(aFiltered);
            }
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
