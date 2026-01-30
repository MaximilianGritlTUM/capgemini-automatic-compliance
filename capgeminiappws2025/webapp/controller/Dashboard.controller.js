sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",        
    "sap/ui/model/FilterOperator"  
], function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.Dashboard", {
        
        onInit: function () {
            this._loadDashboardData();
        },


        onNavToConfig: function () {
            this.getOwnerComponent().getRouter().navTo("configurator");
        },

        onNavToReports: function () {
            this.getOwnerComponent().getRouter().navTo("ComplianceReport");
        },

        onNavToDashboard: function () {
            this.getOwnerComponent().getRouter().navTo("TransactionDashboard");
        },

        _loadDashboardData: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oView = this.getView();
            
            
            var oDateTo = new Date(); //Today
            var oDateFrom = new Date();
            oDateFrom.setDate(oDateTo.getDate() - 3); // 3 days ago

            var aFilters = [
                new Filter("run_timestamp", FilterOperator.GE, oDateFrom)
            ];

            oView.setBusy(true); 
            oModel.read("/Report", {
                filters: aFilters,
                urlParameters: {
                "$orderby": "run_timestamp desc"
                },
                success: function (oData) {
                    oView.setBusy(false);
                    var aResults = oData.results || [];
                    
                    aResults.sort(function(a, b) {
                        return new Date(b.run_timestamp) - new Date(a.run_timestamp);
                    });
                    
                    var sToday = new Date().toISOString().split('T')[0];
                    var aTodayReports = aResults.filter(function(oReport) {
                        if (!oReport.run_timestamp) return false;
                        var sReportDate = (oReport.run_timestamp instanceof Date) 
                        ? oReport.run_timestamp.toISOString().split('T')[0] 
                        : oReport.run_timestamp;
                        return sReportDate === sToday;
                    });
                    
                    var oRecentModel = new JSONModel({
                        RecentReports: aResults, 
                        TotalCount: aResults.length,
                        TodayCount: aTodayReports.length
                    });
                    oView.setModel(oRecentModel, "dashboard");
                },
                error: function (oError) {
                    oView.setBusy(false);
                    console.error("OData call error:", oError);
                }
            });
        },

        onNavToReports: function (oEvent) {
            var oItem = oEvent.getSource();
            var oCtx = oItem.getBindingContext("dashboard");
            var sReportId = oCtx.getProperty("report_id");

            console.log("Navigate to detail. ReportId =", sReportId);
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("ComplianceReportDetail", {
                reportId: sReportId    
            });
        }
    });
});