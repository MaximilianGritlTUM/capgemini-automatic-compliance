sap.ui.define([
	"sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/routing/History",
  "capgeminiappws2025/controller/BaseController"
], function(
	Controller, MessageToast, MessageBox, History, BaseController
) {
	"use strict";

	return BaseController.extend("capgeminiappws2025.controller.Regulation", {
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
        var sTitle = (this.byId("titleInput").getValue() || "").trim();
        var sDescription = (this.byId("descriptionInput").getValue() || "").trim();

        if (!sTitle) {
          MessageBox.error("Please enter a Title before saving.");
          return;
        }

        // optional: ensure model has the same value (usually already true)
        var oCtx = this.getView().getBindingContext();
        if (oCtx) {
          this.getView().getModel().setProperty(oCtx.getPath() + "/Title", sTitle);
          this.getView().getModel().setProperty(oCtx.getPath() + "/Description", sDescription);
        }

        var oModel = this.getView().getModel();
        this.getView().setBusy(true);

        oModel.submitChanges({
          success: function () {
            this.getView().setBusy(false);
            oModel.refresh(true);
            MessageToast.show("Regulation Saved.");
            this.getOwnerComponent().getModel("ui").setProperty("/selectedRegulationPath", oCtx.getPath());
            this.getOwnerComponent().getModel("ui").setProperty("/selectedRegulationDescription", oCtx.getObject().Description);
            this.getOwnerComponent().getRouter().navTo("configurator", {}, true);
          }.bind(this),
          error: function () {
            this.getView().setBusy(false);
            MessageBox.error("Save failed.");
          }.bind(this)
        });
      },
    
    onNavBack: function () {
      var oModel = this.getView().getModel();
      var oCtx = this.getView().getBindingContext();

      // If user created a new entry and navigates back without saving, discard it
      if (oCtx && oModel.hasPendingChanges()) {
        try {
          oModel.deleteCreatedEntry(oCtx); // removes transient created entry
        } catch (e) {
          oModel.resetChanges();
        }
      }

      this.getOwnerComponent().getRouter().navTo("configurator", {}, true);
    }
	});
});