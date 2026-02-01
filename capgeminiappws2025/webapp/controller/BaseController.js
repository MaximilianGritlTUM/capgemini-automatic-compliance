sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function (Controller, History) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.BaseController", {
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            this.getView().getModel().refresh(true);
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("home", {}, true);
            }
        }
    });
});