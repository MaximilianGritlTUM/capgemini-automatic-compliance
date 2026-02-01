sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Sorter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Sorter, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("capgeminiappws2025.controller.TransactionDashboard", {

    _ENTITY: {
      HIST_SUMMARY: "/TASummary"
    },

    onInit: function () {
      const oVm = new JSONModel({
        com: {
          sortBy: "FREQ", // FREQ or VOL
          topN: "50",
          query: "",
          kpi: { totalMovements: 0, totalVolume: 0 }
        }
      });
      this.getView().setModel(oVm, "vm");

      this._bindCommercialTable();
      this._applyCommercialSort();
    },

    /* =========================
       Search Logic
       ========================= */

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

      // Sort 재적용
      const sPath = (sSortKey === "VOL") ? "TotalQuantity" : "MovementCount";
      oBinding.sort([
        new Sorter(sPath, true),
        new Sorter("LastDate", true)
      ]);

      // Filter 적용
      const aFilters = [];
      if (sQuery) {
        aFilters.push(new Filter("Material", FilterOperator.Contains, sQuery));
      }
      oBinding.filter(aFilters);
    },

    /* =========================
       Top N Logic
       ========================= */

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


    /* =========================
       Commercial Table Logic
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
    }
    
  });
});