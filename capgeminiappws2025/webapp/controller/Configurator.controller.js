sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/View",
	"capgeminiappws2025/utils/CheckAlgorithm"
], function (Controller,
	JSONModel,
	View,
	CheckAlgorithm) {
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

            var oModel = this.getView().getModel();
            var oRouter = this.getOwnerComponent().getRouter();

            var oRegulationList = this.byId("regulationList");
            var oSelectedRegulation = oRegulationList.getSelectedItem().getBindingContext().getObject();

            var oChecker = new CheckAlgorithm();

            oChecker.do_checking_algorithm(aData, oModel, oSelectedRegulation).then(function() {
                oRouter.navTo("ComplianceReport");
            }).catch(function(oError) {
                console.error("Readiness check or report creation failed:", oError);
            });
        },

    });
});
