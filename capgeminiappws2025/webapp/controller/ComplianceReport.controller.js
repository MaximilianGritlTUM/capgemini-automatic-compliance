sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, JSONModel, MessageToast, UIComponent) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.ComplianceReport", {

        onInit: function () {
            console.log("ComplianceReport.oninit fired");
            const oMockData = {
                
                Reports: [
                    {
                        ReportId: "RPT-001",
                        Regulation: "REACH",
                        RunTimestamp: "2025-12-15 09:30",
                        DegreeOfFulfillment: 82,
                        DataAvailabilitySummary: "A: 120 / P: 15 / M: 3",
                        Status: "Completed",
                        // Detail Dummy Data
                        Materials: [
                            {
                                ObjectId: "MAT-0001",
                                ObjectName: "Paint Base A",
                                AvailabilityCategory: "AVAILABLE",
                                DataQuality: "GOOD",
                                GapDescription: "",
                                Recommendation: "",
                                DataSource: "MATERIALS"
                            },
                            {
                                ObjectId: "MAT-0002",
                                ObjectName: "Resin B",
                                AvailabilityCategory: "PARTIAL",
                                DataQuality: "MEDIUM",
                                GapDescription: "Missing hazard class",
                                Recommendation: "Enrich substance data",
                                DataSource: "MATERIALS"
                            }
                        ],
                        Suppliers: [
                            {
                                ObjectId: "SUP-0100",
                                ObjectName: "ABC Chemicals",
                                AvailabilityCategory: "MISSING",
                                DataQuality: "LOW",
                                GapDescription: "No REACH certificate",
                                Recommendation: "Request certificate from supplier",
                                DataSource: "SUPPLIER"
                            }
                        ]
                    },
                    {
                        ReportId: "RPT-002",
                        Regulation: "RoHS",
                        RunTimestamp: "2025-12-15 10:05",
                        DegreeOfFulfillment: 67,
                        DataAvailabilitySummary: "A: 80 / P: 25 / M: 10",
                        Status: "Completed",
                        Materials: [],
                        Suppliers: []
                    }
                ]
                
            };
            this.getView().setModel(new JSONModel(oMockData));
        },


        onTableItemPress: function (oEvent) {
            console.log("onTableItemPress fired");
            sap.m.MessageToast.show("Row clicked");
            var oCtx = oEvent.getParameter("listItem").getBindingContext();
            var oReport = oCtx.getObject();

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("ComplianceReportDetail", {
                reportId: oReport.ReportId    
            });
        },


        onOpenFilter: function () {
            //TODO
            MessageToast.show("Filter dialog will open here");
        },

        
    });
})
