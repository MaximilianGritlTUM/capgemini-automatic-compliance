sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
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

        onPressTestResults: function (oEvent) {
            // Logic to test results
        }

    });
});
