sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, JSONModel, MessageToast, UIComponent) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.ComplianceReport", {

        onInit: function () {
            console.log("ComplianceReport View initialized with s40 oData Model");

        },


        onTableItemPress: function (oEvent) {
            console.log("onTableItemPress fired");
            var oCtx = oEvent.getParameter("listItem").getBindingContext();
            var sReportId = oCtx.getProperty("ReportId");
            console.log("Navigate to detail. ReportId =", sReportId);
            var oRouter = this.getOwnerComponent().getRouter();

            oRouter.navTo("ComplianceReportDetail", {
                reportId: sReportId    
            });
        },


        onOpenFilter: function () {
            //TODO
            MessageToast.show("Filter feature maybe implemented here. ");
        },

        
    });
})
