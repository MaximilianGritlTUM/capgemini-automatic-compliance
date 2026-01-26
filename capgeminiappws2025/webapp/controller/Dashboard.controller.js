sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
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

    return Controller.extend("capgeminiappws2025.controller.Dashboard", {

        onInit: function () {
            // Mock data (Later need to change into OData)
            const oData = {
                Kpi: {
                    ActiveMaterials: 128,
                    ActiveSuppliers: 46,
                    Regulations: 3,
                    PendingReviews: 12
                },
                Issues: [
                    {
                        MaterialID: "MAT-1001",
                        MaterialType: "Finished",
                        SupplierName: "Alpha Timber GmbH",
                        Region: "DE",
                        Regulation: "EUDR",
                        Status: "Non-Compliant",
                        RiskLevel: "High",
                        LastUpdated: "2024-11-20"
                    },
                    {
                        MaterialID: "MAT-1023",
                        MaterialType: "Semi-finished",
                        SupplierName: "EcoWood AG",
                        Region: "FR",
                        Regulation: "CSDDD",
                        Status: "Under Review",
                        RiskLevel: "Medium",
                        LastUpdated: "2024-11-19"
                    },
                    {
                        MaterialID: "MAT-1042",
                        MaterialType: "Raw",
                        SupplierName: "Nordic Metals AB",
                        Region: "SE",
                        Regulation: "Machinery",
                        Status: "Compliant",
                        RiskLevel: "Low",
                        LastUpdated: "2024-11-18"
                    }
                ]
            };

            oData.Issues = (oData.Issues || []).map(normalizeMaterialType);

            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        onPressConfigurator: function (oEvent) {
            this.getRouter().navTo("configurator", {}, {}, false);
        }

    });
});
