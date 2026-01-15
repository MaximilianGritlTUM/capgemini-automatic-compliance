sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("capgeminiappws2025.controller.Regulation", {
            onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("Regulation")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sId = oEvent.getParameter("arguments").Id;

      // Replace "Regulations" with your actual EntitySet name
      // If Id is numeric:
      var sPath = "/Z_I_ZREGULATION(" + sId + ")";

      // If Id is string:
      // var sPath = "/Regulations('" + encodeURIComponent(sId) + "')";

      this.getView().bindElement({ path: sPath });
    },

    onSave: function () {
      var oModel = this.getView().getModel();
      this.getView().setBusy(true);

      oModel.submitChanges({
        success: function () {
          this.getView().setBusy(false);
          MessageToast.show("Saved.");
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
        this.getOwnerComponent().getRouter().navTo("Main", {}, true);
      }
    }
        
	});
});