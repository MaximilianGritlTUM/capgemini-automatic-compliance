sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

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
                        SupplierName: "Alpha Timber GmbH",
                        Region: "DE",
                        Regulation: "EUDR",
                        Status: "Non-Compliant",
                        RiskLevel: "High",
                        LastUpdated: "2024-11-20"
                    },
                    {
                        MaterialID: "MAT-1023",
                        SupplierName: "EcoWood AG",
                        Region: "FR",
                        Regulation: "CSDDD",
                        Status: "Under Review",
                        RiskLevel: "Medium",
                        LastUpdated: "2024-11-19"
                    },
                    {
                        MaterialID: "MAT-1042",
                        SupplierName: "Nordic Metals AB",
                        Region: "SE",
                        Regulation: "Machinery",
                        Status: "Compliant",
                        RiskLevel: "Low",
                        LastUpdated: "2024-11-18"
                    }
                ]
            };

            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        onPressConfigurator: function (oEvent) {
            this.getRouter().navTo("configurator", {}, {}, false);
        },

        formatActiveMaterialsKpi: function (activeMaterials, activeProducts) {
            if (activeMaterials === null || activeMaterials === undefined) {
                return activeProducts;
            }
            return activeMaterials;
        }

    });
});
