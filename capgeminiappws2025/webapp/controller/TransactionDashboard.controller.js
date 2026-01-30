sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Sorter"
], function (Controller, JSONModel, MessageToast, Sorter) {
  "use strict";

  return Controller.extend("capgeminiappws2025.controller.TransactionDashboard", {

    _ENTITY: {
      EXCEPTIONS: "/Exceptions",
      HIST_SUMMARY: "/TASummary"
    },

    onInit: function () {
      const oVm = new JSONModel({
        mode: "COM",

        ex: {
          kpi: { total: 0, adjustment: 0, reversal: 0 },
          topMaterials: []
        },

        com: {
          sortBy: "FREQ", // FREQ or VOL
          topN: "50",
          query: "",
          note: "Note: KPIs below are calculated from the loaded Top N rows (not the full dataset).",
          kpi: { totalMovements: 0, totalVolume: 0 }
        }
      });
      this.getView().setModel(oVm, "vm");

      this._bindCommercialTable();

      this._applyCommercialSort();
    },

    onMaterialSearchLive: function (oEvent) {
    const s = (oEvent.getParameter("newValue") || "").trim();
    this.getView().getModel("vm").setProperty("/com/query", s);

    this._debouncedApplyCommercialQuery();
    },

    onMaterialSearch: function (oEvent) {
      const s = (oEvent.getParameter("query") || "").trim();
      this.getView().getModel("vm").setProperty("/com/query", s);
      this._applyCommercialQuery();
    },

    _debouncedApplyCommercialQuery: function () {
      clearTimeout(this._tSearch);
      this._tSearch = setTimeout(() => this._applyCommercialQuery(), 250);
    },

    _applyCommercialQuery: function () {
    const oTable = this.byId("tblTopMaterialsCom");
    const oBinding = oTable && oTable.getBinding("items");
    if (!oBinding) return;

    const oVm = this.getView().getModel("vm");
    const sSortKey = oVm.getProperty("/com/sortBy") || "FREQ";
    const sQuery = (oVm.getProperty("/com/query") || "").trim();

    const sPath = (sSortKey === "VOL") ? "TotalQuantity" : "MovementCount";
    oBinding.sort([
      new sap.ui.model.Sorter(sPath, true),
      new sap.ui.model.Sorter("LastDate", true)
    ]);


    const aFilters = [];
    if (sQuery) {
      aFilters.push(new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sQuery));
    }
    oBinding.filter(aFilters);
    },

    onTopNChange: function (oEvent) {
        const sKey = oEvent.getSource().getSelectedKey(); // "20","50","100","200"
        this.getView().getModel("vm").setProperty("/com/topN", sKey); 

        this._rebindCommercialTable();
        MessageToast.show("Top " + sKey);
    },

    _rebindCommercialTable: function () {
        const oTable = this.byId("tblTopMaterialsCom");
        if (!oTable) return;

        oTable.unbindItems();
        this._bindCommercialTable();

        this._applyCommercialQuery();
    },



    onTabSelect: function (oEvent) {
      const sKey = oEvent.getParameter("key");
      const oVm = this.getView().getModel("vm");
      oVm.setProperty("/mode", sKey);

      if (sKey === "COM") {
        this._applyCommercialSort();
      } else {
        this._loadExceptionsAndBuildDashboard();
      }
    },

    /* =========================
       Commercial
       ========================= */

    onSortSelect: function (oEvent) {
      const sKey = oEvent.getParameter("item").getKey(); // FREQ or VOL
      this.getView().getModel("vm").setProperty("/com/sortBy", sKey);

      this._applyCommercialSort();
      MessageToast.show(sKey === "VOL" ? "Sorted by Quantity (Volume)" : "Sorted by Frequency");
    },

    _bindCommercialTable: function () {
      const oTable = this.byId("tblTopMaterialsCom");
      if (!oTable) return;

      const oTemplate = new sap.m.ColumnListItem({
        cells: [
          new sap.m.Text({ text: "{Material}" }),
          new sap.m.Text({ text: "{Plant}" }),
          new sap.m.ObjectNumber({ number: "{MovementCount}" }),
          new sap.m.ObjectNumber({ number: "{TotalQuantity}" }),
          new sap.m.Text({ text: "{BaseUoM}" }),
          new sap.m.Text({
            text: {
              path: "LastDate",
              type: "sap.ui.model.type.Date",
              formatOptions: { pattern: "yyyy-MM-dd" }
            }
          })
        ]
      });

      const oVm = this.getView().getModel("vm");
      const iTopN = Number(oVm.getProperty("/com/topN") || "50");

      oTable.bindItems({
        path: this._ENTITY.HIST_SUMMARY,
        template: oTemplate,
        //parameters: { "$top": iTopN },
        length: iTopN,
        events: { dataReceived: this._onCommercialDataReceived.bind(this) }
      });
    },

    _applyCommercialSort: function () {
      const oTable = this.byId("tblTopMaterialsCom");
      const oBinding = oTable && oTable.getBinding("items");
      if (!oBinding) return;

      const oVm = this.getView().getModel("vm");
      const sSortKey = oVm.getProperty("/com/sortBy") || "FREQ";
      const sPath = (sSortKey === "VOL") ? "TotalQuantity" : "MovementCount";

      oBinding.sort([
        new Sorter(sPath, true),
        new Sorter("LastDate", true)
      ]);
    },

    _onCommercialDataReceived: function () {
      const oTable = this.byId("tblTopMaterialsCom");
      const oBinding = oTable && oTable.getBinding("items");
      if (!oBinding) return;

      const aContexts = oBinding.getCurrentContexts();
      let totalMovements = 0;
      let totalVolume = 0;

      for (let i = 0; i < aContexts.length; i++) {
        const o = aContexts[i].getObject();
        totalMovements += Number(o.MovementCount || 0);
        totalVolume += Number(o.TotalQuantity || 0);
      }

      const oVm = this.getView().getModel("vm");
      oVm.setProperty("/com/kpi/totalMovements", totalMovements);
      oVm.setProperty("/com/kpi/totalVolume", totalVolume);
    },

    /* =========================
       Exceptions (기존 유지)
       ========================= */

    _loadExceptionsAndBuildDashboard: function () {
      const oOData = this.getOwnerComponent().getModel();
      if (!oOData) {
        MessageToast.show("OData model not found (default model).");
        return;
      }

      oOData.read(this._ENTITY.EXCEPTIONS, {
        urlParameters: { "$top": 5000 },
        success: (oData) => {
          const aRows = (oData && oData.results) ? oData.results : [];

          let total = 0, adj = 0, rev = 0;
          const byMaterial = new Map();

          for (let i = 0; i < aRows.length; i++) {
            const r = aRows[i];
            total += 1;

            if (r.ExceptionType === "ADJUSTMENT") adj += 1;
            else if (r.ExceptionType === "REVERSAL") rev += 1;

            const m = (r.Material && String(r.Material).trim()) ? r.Material : "(blank)";
            byMaterial.set(m, (byMaterial.get(m) || 0) + 1);
          }

          const aTop = Array.from(byMaterial.entries())
            .map(([Material, ExceptionCount]) => ({ Material, ExceptionCount }))
            .sort((a, b) => b.ExceptionCount - a.ExceptionCount)
            .slice(0, 20);

          const oVm = this.getView().getModel("vm");
          oVm.setProperty("/ex/kpi/total", total);
          oVm.setProperty("/ex/kpi/adjustment", adj);
          oVm.setProperty("/ex/kpi/reversal", rev);
          oVm.setProperty("/ex/topMaterials", aTop);
        },
        error: () => {
          MessageToast.show("Failed to load Exceptions.");
        }
      });
    }

  });
});
