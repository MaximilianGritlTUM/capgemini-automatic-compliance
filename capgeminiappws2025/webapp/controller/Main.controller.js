sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
function (Controller) {
    "use strict";

    function normalizeMaterialType(o) {
        // Keep originals, just ensure MaterialType fields exist if ProductType exists.
        if (!o) return o;

        if (!o.MaterialType && o.ProductType) {
            o.MaterialType = o.ProductType;
        }
        if (!o.MaterialTypeText && o.ProductTypeText) {
            o.MaterialTypeText = o.ProductTypeText;
        }
        return o;
    }

    return Controller.extend("capgeminiappws2025.controller.Main", {
        onInit: function () {
            var oModel = this.getView().getModel();
            if (oModel && typeof oModel.getData === "function" && typeof oModel.setData === "function") {
                var oData = oModel.getData();
                oData.Protocols = (oData.Protocols || []).map(normalizeMaterialType);
                oModel.setData(oData);
            }
        }
    });
});
