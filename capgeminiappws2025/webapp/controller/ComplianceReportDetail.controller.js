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
                    expand: "to_Results,to_BOMResults,to_Regulation"
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
                TransactionHistoryFilter.loadMaterialActivityStatus(oModel, 72).catch(function () {
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

        onExportReport: function () {
            var oView = this.getView();

            // 1. Extract Fields data (Materials + Suppliers)
            var aFieldsData = [];
            var oMaterialsTable = oView.byId("materialsTable");
            var oSuppliersTable = oView.byId("suppliersTable");

            if (oMaterialsTable) {
                oMaterialsTable.getItems().forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext();
                    if (!oCtx) { return; }
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
                    aFieldsData.push({
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

            // 2. Extract BOM data from the bom JSONModel
            var aBomData = [];
            var oBomModel = oView.getModel("bom");
            if (oBomModel) {
                var aBomRaw = oBomModel.getData() || [];
                aBomRaw.forEach(function (oRoot) {
                    var aNodes = [oRoot];
                    if (oRoot.to_Children && oRoot.to_Children.length) {
                        aNodes = aNodes.concat(oRoot.to_Children);
                    }
                    aNodes.forEach(function (oNode) {
                        aBomData.push({
                            ID: oNode.parent_matnr || "",
                            Name: oNode.material_description || "",
                            "BOM Number": oNode.bom_number || "",
                            Plant: oNode.Plant || "",
                            "Activity Status": oNode.activity_status || "",
                            Availability: oNode.avail_cat || "",
                            "Data Quality": oNode.data_quality || "",
                            "Data Gaps": oNode.gap_desc || "",
                            Recommendations: oNode.recommendation || ""
                        });
                    });
                });
            }

            if (!aFieldsData.length && !aBomData.length) {
                MessageToast.show("No data available to export.");
                return;
            }

            // 3. Build multi-sheet workbook using SheetJS (xlsx)
            var that = this;
            this._loadXlsx().then(function (XLSX) {
                var wb = XLSX.utils.book_new();

                // Fields sheet
                if (aFieldsData.length) {
                    var wsFields = XLSX.utils.json_to_sheet(aFieldsData, {
                        header: ["Type", "ObjectId", "ObjectName", "AvailabilityCategory", "DataQuality", "GapDescription", "Recommendation", "DataSource"]
                    });
                    // Rename headers to friendly labels
                    wsFields["A1"].v = "Type";
                    wsFields["B1"].v = "ID";
                    wsFields["C1"].v = "Name";
                    wsFields["D1"].v = "Availability";
                    wsFields["E1"].v = "Data Quality";
                    wsFields["F1"].v = "Data Gaps / Activity";
                    wsFields["G1"].v = "Recommendations";
                    wsFields["H1"].v = "Data Source";
                    XLSX.utils.book_append_sheet(wb, wsFields, "Fields");
                }

                // BOM sheet
                if (aBomData.length) {
                    var wsBom = XLSX.utils.json_to_sheet(aBomData);
                    XLSX.utils.book_append_sheet(wb, wsBom, "BOM");
                }

                XLSX.writeFile(wb, "ReadinessReport_Detail.xlsx");
                MessageToast.show("Report exported successfully.");
            }).catch(function () {
                MessageToast.show("Failed to load export library.");
            });
        },

        /**
         * Loads the SheetJS (xlsx) library dynamically from CDN.
         * @returns {Promise} Resolves with the XLSX global object.
         */
        _loadXlsx: function () {
            if (window.XLSX) {
                return Promise.resolve(window.XLSX);
            }
            return new Promise(function (resolve, reject) {
                var script = document.createElement("script");
                script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
                script.onload = function () {
                    resolve(window.XLSX);
                };
                script.onerror = function () {
                    reject(new Error("Failed to load SheetJS library"));
                };
                document.head.appendChild(script);
            });
        },

        onActivityFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();

            // Filter BOM tab — client-side JSONModel filtering
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
