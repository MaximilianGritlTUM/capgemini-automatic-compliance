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
      // ViewModel for UI binding (KPI + Top table + Transaction History)
      const oVm = new JSONModel({
        kpi: {
          total: 0,
          adjustment: 0,
          reversal: 0
        },
        topMaterials: [],
        // Transaction History section
        history: {
          kpi: {
            totalMaterials: 0,
            totalMovements: 0,
            totalQuantity: 0,
            uniquePlants: 0
          },
          materials: []
        }
      });
      this.getView().setModel(oVm, "vm");

      // Wait for OData model to be ready before loading data
      const oOData = this.getView().getModel();
      if (oOData) {
        oOData.metadataLoaded().then(() => {
          this._loadExceptionsAndBuildDashboard();
          this._loadTransactionHistory();
        });
      }
    },

    // ======================= TRANSACTION HISTORY HANDLERS =======================

    onApplyHistory: function () {
      this._loadTransactionHistory();
    },

    onResetHistory: function () {
      this.byId("inHistoryPlant").setValue("");
      this.byId("inMinMovements").setValue("");
      this.byId("inMinQuantity").setValue("");
      this._loadTransactionHistory();
    },

    /**
     * Loads transaction history summary from TASummary entity.
     * Computes KPIs and identifies materials with meaningful activity.
     */
    _loadTransactionHistory: function () {
      const oOData = this.getView().getModel();
      if (!oOData) {
        MessageToast.show("OData model not found.");
        return;
      }

      const aFilters = this._buildFiltersForHistory();

      // Entity set exposed as TASummary (from Z_I_TA_HISTORYSUMMARY)
      const sEntitySet = "/TASummary";

      oOData.read(sEntitySet, {
        filters: aFilters,
        urlParameters: {
          "$top": 1000
        },
        success: (oData) => {
          const aRows = (oData && oData.results) ? oData.results : [];
          this._processTransactionHistory(aRows);
        },
        error: (oErr) => {
          MessageToast.show("Failed to load /TASummary. Check EntitySet name in Network tab.");
          console.error("OData read error for TASummary:", oErr);
        }
      });
    },

    /**
     * Processes transaction history data and updates the view model.
     * @param {Array} aRows - Raw data from TASummary
     */
    _processTransactionHistory: function (aRows) {
      const oVm = this.getView().getModel("vm");

      // Get filter thresholds from UI
      const iMinMovements = parseInt(this.byId("inMinMovements").getValue(), 10) || 0;
      const iMinQuantity = parseFloat(this.byId("inMinQuantity").getValue()) || 0;

      // Filter for meaningful materials based on thresholds
      let aFiltered = aRows;
      if (iMinMovements > 0) {
        aFiltered = aFiltered.filter(function (r) {
          return (parseInt(r.MovementCount, 10) || 0) >= iMinMovements;
        });
      }
      if (iMinQuantity > 0) {
        aFiltered = aFiltered.filter(function (r) {
          return (parseFloat(r.TotalQuantity) || 0) >= iMinQuantity;
        });
      }

      // Calculate KPIs
      let iTotalMovements = 0;
      let fTotalQuantity = 0;
      const oPlants = new Set();

      aFiltered.forEach(function (r) {
        iTotalMovements += parseInt(r.MovementCount, 10) || 0;
        fTotalQuantity += parseFloat(r.TotalQuantity) || 0;
        if (r.Plant) {
          oPlants.add(r.Plant);
        }
      });

      // Determine activity status for each material
      const aMaterials = aFiltered.map(function (r) {
        const iMoves = parseInt(r.MovementCount, 10) || 0;
        const fQty = parseFloat(r.TotalQuantity) || 0;

        // Activity classification
        let sStatus = "Low Activity";
        let sState = "Warning";
        if (iMoves >= 5 || fQty >= 500) {
          sStatus = "High Activity";
          sState = "Success";
        } else if (iMoves >= 2 || fQty >= 100) {
          sStatus = "Medium Activity";
          sState = "None";
        }

        return {
          Material: r.Material || "",
          Plant: r.Plant || "",
          BaseUoM: r.BaseUoM || "",
          MovementCount: iMoves,
          TotalQuantity: fQty,
          ActivityStatus: sStatus,
          ActivityState: sState
        };
      });

      // Sort by TotalQuantity descending
      aMaterials.sort(function (a, b) {
        return b.TotalQuantity - a.TotalQuantity;
      });

      // Update view model
      oVm.setProperty("/history/kpi/totalMaterials", aFiltered.length);
      oVm.setProperty("/history/kpi/totalMovements", iTotalMovements);
      oVm.setProperty("/history/kpi/totalQuantity", fTotalQuantity.toFixed(2));
      oVm.setProperty("/history/kpi/uniquePlants", oPlants.size);
      oVm.setProperty("/history/materials", aMaterials);

      if (aFiltered.length === 0) {
        MessageToast.show("No materials found matching the filter criteria.");
      }
    },

    /**
     * Builds OData filters for transaction history based on UI inputs.
     */
    _buildFiltersForHistory: function () {
      const aFilters = [];

      const sPlant = (this.byId("inHistoryPlant").getValue() || "").trim();
      if (sPlant) {
        aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
      }

      return aFilters;
    },

    // ======================= EXCEPTION HANDLERS =======================

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
