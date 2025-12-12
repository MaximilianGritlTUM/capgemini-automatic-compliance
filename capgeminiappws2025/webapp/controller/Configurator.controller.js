sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.Configurator", {

        onInit: function () {
      // Initialization code if needed
    },

    onAfterRendering: function () {
      let oModel = this.getView().getModel();

      oModel.read("/Z_I_ZCONFIG", {
        success: function (oData) {
          console.log("Config data:", oData);
        },
        error: function (oError) {
          console.error("Error fetching config data:", oError);
        }
      });
    },

    onPressAddRegulation: function (oEvent) {
        // Logic to add a new regulation
    },

    onPressAddRule: function (oEvent) {
        // Logic to add a new rule
    },

    onPressSaveConfiguration: function (oEvent) {
        // Logic to add a new rule
    },

    onPressTestResults: function (oEvent) {
        // Logic to add a new rule
    }

    });
});
