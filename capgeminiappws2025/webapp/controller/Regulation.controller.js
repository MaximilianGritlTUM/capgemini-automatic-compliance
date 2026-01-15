sap.ui.define([
	"sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/routing/History"
], function(
	Controller, MessageToast, MessageBox, History
) {
	"use strict";

	return Controller.extend("capgeminiappws2025.controller.Regulation", {
            onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("Regulation")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sContextPath = decodeURIComponent(oEvent.getParameter("arguments").contextPath);
      this.getView().bindElement({ path: sContextPath });
    },

    onSave: function () {
      var oModel = this.getView().getModel();
      this.getView().setBusy(true);

      oModel.submitChanges({
        success: function () {
          this.getView().setBusy(false);

          this.getView().getModel().refresh(true);

          MessageToast.show("Regulation Saved.");
          
          this.getOwnerComponent().getRouter().navTo("configurator", {}, true);
        }.bind(this),
        error: function () {
          this.getView().setBusy(false);
          MessageBox.error("Save failed.");
        }.bind(this)
      });
    },
    
    onNavBack: function () {
      var sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getOwnerComponent().getRouter().navTo("home", {}, true);
      }
    }
	});
});