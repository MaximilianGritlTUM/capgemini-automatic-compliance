sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
  "use strict";

  return Controller.extend("capgeminiappws2025.controller.TransactionDashboard", {

    onInit: function () {
      // ViewModel for UI binding (KPI + Top table)
      const oVm = new JSONModel({
        kpi: {
          total: 0,
          adjustment: 0,
          reversal: 0
        },
        topMaterials: []
      });
      this.getView().setModel(oVm, "vm");

      // Initial load
      this._loadExceptionsAndBuildDashboard();
    },

    onApply: function () {
      this._loadExceptionsAndBuildDashboard();
    },

    onReset: function () {
      this.byId("dpFrom").setDateValue(null);
      this.byId("dpTo").setDateValue(null);
      this.byId("inPlant").setValue("");
      this._loadExceptionsAndBuildDashboard();
    },

    /**
     * Reads exception line items from OData and computes:
     * - KPI counts (total/adjustment/reversal)
     * - Top materials by exception count
     */
    _loadExceptionsAndBuildDashboard: function () {
      const oOData = this.getView().getModel(); // default OData V2 model
      if (!oOData) {
        MessageToast.show("OData model not found (default model). Check manifest.json model setup.");
        return;
      }

      const aFilters = this._buildFiltersForExceptions();

      // IMPORTANT: EntitySet name must match your Service Definition expose alias
      // Example: expose Z_I_TA_ExLine as Exceptions;
      const sEntitySet = "/Exceptions";

      oOData.read(sEntitySet, {
        filters: aFilters,
        urlParameters: {
          // MVP: read up to N exceptions then aggregate in frontend
          // If you have too many records, lower $top or add more backend restriction
          "$top": 5000
        },
        success: (oData) => {
          const aRows = (oData && oData.results) ? oData.results : [];

          // KPI
          let total = 0;
          let adj = 0;
          let rev = 0;

          // Top materials
          const byMaterial = new Map(); // Material -> count

          for (let i = 0; i < aRows.length; i++) {
            const r = aRows[i];
            total += 1;

            if (r.ExceptionType === "ADJUSTMENT") {
              adj += 1;
            } else if (r.ExceptionType === "REVERSAL") {
              rev += 1;
            }

            const m = (r.Material && String(r.Material).trim()) ? r.Material : "(blank)";
            byMaterial.set(m, (byMaterial.get(m) || 0) + 1);
          }

          const aTop = Array.from(byMaterial.entries())
            .map(([Material, ExceptionCount]) => ({ Material, ExceptionCount }))
            .sort((a, b) => b.ExceptionCount - a.ExceptionCount)
            .slice(0, 20);

          const oVm = this.getView().getModel("vm");
          oVm.setProperty("/kpi/total", total);
          oVm.setProperty("/kpi/adjustment", adj);
          oVm.setProperty("/kpi/reversal", rev);
          oVm.setProperty("/topMaterials", aTop);

          if (total === 0) {
            MessageToast.show("No exceptions found for the current filters.");
          }
        },
        error: (oErr) => {
          // Most common: 404 EntitySet mismatch -> check $metadata for correct EntitySet name
          MessageToast.show("Failed to load /Exceptions. Check EntitySet name and Network tab.");
          // eslint-disable-next-line no-console
          console.error("OData read error:", oErr);
        }
      });
    },

    /**
     * Filters applied to the exception line items.
     * NOTE: PostingDate should exist on /Exceptions entity type.
     */
    _buildFiltersForExceptions: function () {
      const a = [];

      const dFrom = this.byId("dpFrom").getDateValue();
      const dTo = this.byId("dpTo").getDateValue();
      const sPlant = (this.byId("inPlant").getValue() || "").trim();

      if (dFrom) {
        a.push(new Filter("PostingDate", FilterOperator.GE, dFrom));
      }
      if (dTo) {
        a.push(new Filter("PostingDate", FilterOperator.LE, dTo));
      }
      if (sPlant) {
        a.push(new Filter("Plant", FilterOperator.EQ, sPlant));
      }

      return a;
    }

  });
});
