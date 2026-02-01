sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/mvc/View",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "capgeminiappws2025/utils/CheckAlgorithm",
        "sap/m/BusyDialog",
        "sap/m/Text",
        "sap/m/VBox",
        "sap/m/SelectDialog",
        "sap/m/StandardListItem",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/Button"

    ],
    function (
        Controller,
        JSONModel,
        View,
        MessageToast,
        MessageBox,
        CheckAlgorithm,
        BusyDialog,
        Text,
        VBox,
        SelectDialog,
        StandardListItem,
        Filter,
        FilterOperator,
        Button
    ) {
        "use strict";

        return Controller.extend("capgeminiappws2025.controller.configurator.ConfiguratorMain", {
            onInit: function () {
                this._busyDialog = new BusyDialog({
                    title: "Starting Readiness Check",
                    content: new VBox({
                        items: [
                            new Text({ text: "Starting Readiness Check..." })
                        ]
                    })
                });

                this.getOwnerComponent().getRouter()
                    .getRoute("configurator")
                    .attachPatternMatched(this._onRouteMatched, this);
            },

            onExit: function () {
                if (this._oAddRuleDialog) {
                    this._oAddRuleDialog.destroy();
                    this._oAddRuleDialog = null;
                }
                this._busyDialog?.destroy();
                this._busyDialog = null;
            },

            onEditRegulation: function (oEvent) {
                var oCtx = oEvent.getSource().getBindingContext();
                if (!oCtx) {
                    return;
                }
                var sRegulationId = String(oCtx.getProperty("Id"));

                this.getView()
                    .getModel("ui")
                    .setProperty("/editRegulationId", sRegulationId);

                var oList = this.byId("regulationList");
                setTimeout(
                    function () {
                        var sPath = oCtx.getPath();
                        var oItem = (oList.getItems() || []).find(function (it) {
                            return (
                                it.getBindingContext() &&
                                it.getBindingContext().getPath() === sPath
                            );
                        });
                        if (!oItem) {
                            return;
                        }

                        var aContent =
                            (oItem.getContent && oItem.getContent()) ||
                            (oItem.getCells && oItem.getCells()) ||
                            [];
                        var oInput = aContent.find(function (c) {
                            return c && c.isA && c.isA("sap.m.Input");
                        });
                        if (!oInput) {
                            return;
                        }

                        try {
                            oInput.focus();
                        } catch (e) { }

                        if (!oInput._bEditHandlersAttached) {
                            oInput.addEventDelegate({
                                onAfterRendering: function () {
                                    var oFocusDom =
                                        oInput.getFocusDomRef && oInput.getFocusDomRef();
                                    if (!oFocusDom) {
                                        return;
                                    }

                                    var fnCancel = function () {
                                        this.getView()
                                            .getModel("ui")
                                            .setProperty("/editRegulationId", null);
                                    }.bind(this);

                                    var fnKey = function (ev) {
                                        if (ev.key === "Enter" || ev.keyCode === 13) {
                                            try {
                                                oInput.fireSubmit();
                                            } catch (e) { }
                                            setTimeout(
                                                function () {
                                                    this.getView()
                                                        .getModel("ui")
                                                        .setProperty("/editRegulationId", null);
                                                }.bind(this),
                                                0
                                            );
                                        }
                                    }.bind(this);

                                    oFocusDom.addEventListener("blur", fnCancel);
                                    oFocusDom.addEventListener("keydown", fnKey);
                                    oInput._domHandlers = {
                                        dom: oFocusDom,
                                        blur: fnCancel,
                                        keydown: fnKey,
                                    };
                                    try {
                                        oInput.focus();
                                    } catch (e) { }
                                }.bind(this),

                                onBeforeRendering: function () {
                                    if (oInput._domHandlers && oInput._domHandlers.dom) {
                                        try {
                                            oInput._domHandlers.dom.removeEventListener(
                                                "blur",
                                                oInput._domHandlers.blur
                                            );
                                            oInput._domHandlers.dom.removeEventListener(
                                                "keydown",
                                                oInput._domHandlers.keydown
                                            );
                                        } catch (e) { }
                                        oInput._domHandlers = null;
                                    }
                                },
                            });
                            oInput._bEditHandlersAttached = true;
                        }
                    }.bind(this),
                    0
                );
            },

            onSubmitRegulationTitle: function (oEvent) {
                var oInput = oEvent.getSource();
                var oCtx = oInput.getBindingContext();
                if (!oCtx) {
                    return;
                }

                var oModel = oCtx.getModel();
                var sPath = oCtx.getPath();
                var sValue = ((oInput.getValue && oInput.getValue()) || "").trim();

                var oValueBinding = oInput.getBinding && oInput.getBinding("value");
                var sProp = oValueBinding ? oValueBinding.getPath() : "Title";

                if (sValue === oCtx.getObject().Title) {
                    this.getOwnerComponent().getModel("ui").setProperty("/editRegulationId", null);
                    oInput.setValue(oCtx.getObject().Title);
                    return;
                }

                oModel.setProperty(sPath + "/" + sProp, sValue);

                if (typeof oModel.submitChanges === "function") {
                    oModel.submitChanges({
                        success: function () {
                            oModel.read(sPath, {
                                success: function (oEntity) {
                                    oModel.setProperty(sPath, oEntity);
                                    MessageToast.show("Regulation updated");
                                },
                                error: function () {
                                    MessageToast.show("Regulation updated (refresh failed)");
                                },
                            });
                        },
                        error: function (oError) {
                            console.error("submitChanges error:", oError);
                            MessageToast.show("Update failed");
                        },
                    });
                } else if (typeof oModel.update === "function") {
                    var payload = {};
                    payload[sProp] = sValue;
                    oModel.update(sPath, payload, {
                        method: "MERGE",
                        success: function () {
                            MessageToast.show("Regulation updated");
                        },
                        error: function (oErr) {
                            console.error("update error:", oErr);
                            MessageToast.show("Update failed");
                        },
                    });
                }

                this.getOwnerComponent().getModel("ui").setProperty("/editRegulationId", null);
            },

            _onRouteMatched: function () {
                var oList = this.byId("regulationList");
                var oBinding = oList.getBinding("items");
                if (oBinding) {
                    oBinding.refresh(true);
                } else {
                    this.getView().getModel().refresh(true);
                }

                if (this.getOwnerComponent().getModel("ui").getProperty("/selectedRegulationPath")) {
                    oList.setSelectedItem(oList.getItems().find(function (it) {
                        return ( it.getBindingContext() && it.getBindingContext().getPath() === this.getOwnerComponent().getModel("ui").getProperty("/selectedRegulationPath") );
                    }.bind(this)));
                    this.byId("detailPanel").setVisible(true);
                }
            },

            onSelectRegulation: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oContext = oSelectedItem.getBindingContext(); // default model
                if (!oContext) {
                    return;
                }

                this.getOwnerComponent().getModel("ui").setProperty("/selectedRegulationPath", oContext.getPath());
                this.getOwnerComponent().getModel("ui").setProperty("/selectedRegulationDescription", oContext.getObject().Description);

                this.byId("detailPanel").setVisible(true)
            },

            onPressAddRegulation: function () {
                var oModel = this.getView().getModel();
                var oRouter = this.getOwnerComponent().getRouter();

                var sEntitySetPath = "/Z_I_ZREGULATION";

                var oContext = oModel.createEntry(sEntitySetPath, {
                    properties: {
                        Description: ""
                    }
                });

                oModel.setProperty(oContext.getPath() + "/Id", "");

                oRouter.navTo("Regulation", {
                    contextPath: encodeURIComponent(oContext.getPath())
                });
            },

            onPressSaveConfiguration: function () {
                /* save config logic */
            },

            onPressStartReadinessCheck: async function () {
                this._busyDialog.open();

                await new Promise((r) => setTimeout(r, 0));

                try {
                    var oModel = this.getView().getModel();
                    var oRouter = this.getOwnerComponent().getRouter();

                    var oRegulationList = this.byId("regulationList");
                    var oSelectedItem = oRegulationList.getSelectedItem();
                    if (!oSelectedItem) {
                        throw new Error("No regulation selected.");
                    }
                    var oSelectedRegulation = oSelectedItem.getBindingContext().getObject();

                    var oChecker = new CheckAlgorithm();

                    var aData = [];

                    const readPromise = new Promise((resolve, reject) => {
                        oModel.read(this.getOwnerComponent().getModel("ui").getProperty("/selectedRegulationPath") + "/to_Fields", {
                            success: function (oData) {
                                aData = oData.results;
                                resolve(aData);
                            },
                            error: function (oError) {
                                reject(oError);
                        }
                    });
                    });

                    await readPromise;

                    if (!aData || !Array.isArray(aData) || aData.length === 0) {
                        sap.m.MessageBox.error("No rules found for the selected regulation.");
                        return;
                    }

                    await oChecker.do_checking_algorithm(aData, oModel, oSelectedRegulation);

                    oRouter.navTo("ComplianceReport");
                } catch (oError) {
                    console.error("Readiness check failed:", oError);
                    sap.m.MessageBox.error(
                        (oError && oError.message) ? oError.message : "Readiness check failed."
                    );
                } finally {
                    this._busyDialog.close();
                }
            },

            onDeleteRegulation: function (oEvent) {
                var oSource = oEvent.getSource();
                var oCtx = oSource.getBindingContext();
                if (!oCtx) {
                    return;
                }

                var oObject = oCtx.getObject();
                var sTitle = oObject && oObject.Title ? oObject.Title : "";

                var sPath = oCtx.getPath();
                var oModel = oCtx.getModel();

                var oUi = this.getOwnerComponent().getModel("ui");
                var sSelectedPath = oUi.getProperty("/selectedRegulationPath");
                var detailPanel = this.byId("detailPanel");

                MessageBox.confirm("Are you sure about deleting regulation \"" + sTitle + "\"?", {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oModel.remove(sPath, {
                                success: function () {
                                    MessageToast.show("Regulation deleted");
                                    if (sPath === sSelectedPath) {
                                        oUi.setProperty("/selectedRegulationPath", null);
                                        oUi.setProperty("/selectedRegulationDescription", null);
                                        detailPanel.setVisible(false);
                                    }
                                },
                                error: function (oError) {
                                    MessageToast.show("Delete failed");
                                    console.error("Delete error:", oError);
                                },
                            });
                        }
                    },
                });
            },

            onPressSelectMarket: function () {
                this._ensureMarketDialog()
                    .then(function () {
                        this._oMarketDialog.open();
                    }.bind(this))
                    .catch(function (e) {
                        console.error("Market dialog error:", e);
                        MessageBox.error("Could not load target markets.");
                    });
            },

            _ensureMarketDialog: function () {
                if (this._oMarketDialog) {
                    return Promise.resolve();
                }

                this._oMarketDialog = new SelectDialog({
                    title: "Select Market",

                    search: function (oEvent) {
                        var sValue = (oEvent.getParameter("value") || "").trim().toUpperCase();
                        var oBinding = oEvent.getSource().getBinding("items");

                        if (!oBinding) {
                            return;
                        }

                        oBinding.filter(
                            sValue
                                ? [new Filter("Country_Code", FilterOperator.Contains, sValue)]
                                : []
                        );
                    },

                    confirm: function (oEvent) {
                        var oItem = oEvent.getParameter("selectedItem");
                        var sCode = oItem ? oItem.getTitle() : "";

                        this.getOwnerComponent().getModel("ui").setProperty("/selectedMarket", sCode);
                        this._applyIntersectionFiltersV2();
                    }.bind(this),

                    cancel: function () {
                        // dialog closes automatically
                    }
                });

                return this._loadDistinctMarketsV2().then(function (aMarkets) {
                    this._oMarketDialog.setModel(
                        new JSONModel({ Markets: aMarkets }),
                        "markets"
                    );

                    this._oMarketDialog.bindAggregation("items", {
                        path: "markets>/Markets",
                        template: new StandardListItem({
                            title: "{markets>Country_Code}"
                        })
                    });

                    this.getView().addDependent(this._oMarketDialog);
                }.bind(this));
            },

            onClearMarketFilter: function () {
                this.getOwnerComponent().getModel("ui").setProperty("/selectedMarket", "");
                this._applyIntersectionFiltersV2();
            },
            onPressSelectOrigin: function () {
                this._ensureOriginDialog()
                    .then(function () {
                        this._oOriginDialog.open();
                    }.bind(this))
                    .catch(function (e) {
                        console.error("Origin dialog error:", e);
                        MessageBox.error("Could not load origins.");
                    });
            },

            _ensureOriginDialog: function () {
                if (this._oOriginDialog) {
                    return Promise.resolve();
                }

                this._oOriginDialog = new SelectDialog({
                    title: "Select Origin",

                    search: function (oEvent) {
                        var sValue = (oEvent.getParameter("value") || "").trim().toUpperCase();
                        var oBinding = oEvent.getSource().getBinding("items");

                        if (!oBinding) {
                            return;
                        }

                        oBinding.filter(
                            sValue
                                ? [new Filter("Country_Code", FilterOperator.Contains, sValue)]
                                : []
                        );
                    },

                    confirm: function (oEvent) {
                        var oItem = oEvent.getParameter("selectedItem");
                        var sCode = oItem ? oItem.getTitle() : "";

                        this.getOwnerComponent().getModel("ui").setProperty("/selectedOrigin", sCode);
                        this._applyIntersectionFiltersV2();
                    }.bind(this),

                    cancel: function () {
                        // dialog closes automatically
                    }
                });

                return this._loadDistinctOriginsV2().then(function (aOrigins) {
                    this._oOriginDialog.setModel(
                        new JSONModel({ Origins: aOrigins }),
                        "origins"
                    );

                    this._oOriginDialog.bindAggregation("items", {
                        path: "origins>/Origins",
                        template: new StandardListItem({
                            title: "{origins>Country_Code}"
                        })
                    });

                    this.getView().addDependent(this._oOriginDialog);
                }.bind(this));
            },

            onClearOriginFilter: function () {
                this.getOwnerComponent().getModel("ui").setProperty("/selectedOrigin", "");
                this._applyIntersectionFiltersV2();
            },

            _loadDistinctOriginsV2: function () {
                var oModel = this.getView().getModel();

                return new Promise(function (resolve, reject) {
                    if (!oModel || typeof oModel.read !== "function") {
                        reject(new Error("OData V2 model missing or read() not available."));
                        return;
                    }

                    oModel.read("/Z_I_ZREG_COUNTRY", {
                        filters: [
                            new Filter("Role", FilterOperator.EQ, "Supplier Origin")
                        ],
                        urlParameters: {
                            "$select": "Country_Code",
                            "$top": "5000"
                        },
                        success: function (oData) {
                            var aResults = (oData && oData.results) ? oData.results : [];

                            var oSeen = Object.create(null);
                            var aDistinct = [];

                            aResults.forEach(function (r) {
                                var sCode = r && r.Country_Code ? String(r.Country_Code).trim().toUpperCase() : "";
                                if (!sCode || oSeen[sCode]) {
                                    return;
                                }
                                oSeen[sCode] = true;
                                aDistinct.push({ Country_Code: sCode });
                            });

                            aDistinct.sort(function (a, b) {
                                return a.Country_Code.localeCompare(b.Country_Code);
                            });

                            resolve(aDistinct);
                        },
                        error: function (oErr) {
                            reject(oErr);
                        }
                    });
                });
            },

            
            _loadDistinctMarketsV2: function () {
                var oModel = this.getView().getModel();

                return new Promise(function (resolve, reject) {
                    if (!oModel || typeof oModel.read !== "function") {
                        reject(new Error("OData V2 model missing or read() not available."));
                        return;
                    }

                    oModel.read("/Z_I_ZREG_COUNTRY", {
                        filters: [
                            new Filter("Role", FilterOperator.EQ, "Target Market") 
                        ],
                        urlParameters: {
                            "$select": "Country_Code",
                            "$top": "5000"
                        },
                        success: function (oData) {
                            var aResults = (oData && oData.results) ? oData.results : [];

                            var oSeen = Object.create(null);
                            var aDistinct = [];

                            aResults.forEach(function (r) {
                                var sCode = r && r.Country_Code ? String(r.Country_Code).trim().toUpperCase() : "";
                                if (!sCode || oSeen[sCode]) {
                                    return;
                                }
                                oSeen[sCode] = true;
                                aDistinct.push({ Country_Code: sCode });
                            });

                            aDistinct.sort(function (a, b) {
                                return a.Country_Code.localeCompare(b.Country_Code);
                            });

                            resolve(aDistinct);
                        },
                        error: function (oErr) {
                            reject(oErr);
                        }
                    });
                });
            },


            _applyIntersectionFiltersV2: function () {
                var oList = this.byId("regulationList");
                var oBinding = oList && oList.getBinding("items");
                var oModel = this.getView().getModel();
                var oUI = this.getOwnerComponent().getModel("ui");

                if (!oBinding) {
                    MessageBox.error("Regulation list binding not found. Expected List id='regulationList' with aggregation 'items'.");
                    return;
                }

                var sMarket = (oUI.getProperty("/selectedMarket") || "").trim();
                var sOrigin = (oUI.getProperty("/selectedOrigin") || "").trim();

                // If both filters are empty, clear
                if (!sMarket && !sOrigin) {
                    oBinding.filter([]);
                    return;
                }

                // If only one filter is set, apply it
                if (sMarket && !sOrigin) {
                    this._getMarketRegids(sMarket, function (aMarketRegids) {
                        this._applyFilterByRegids(oBinding, aMarketRegids);
                    }.bind(this));
                    return;
                }

                if (sOrigin && !sMarket) {
                    this._getOriginRegids(sOrigin, function (aOriginRegids) {
                        this._applyFilterByRegids(oBinding, aOriginRegids);
                    }.bind(this));
                    return;
                }

                // Both filters are set: intersect them
                Promise.all([
                    new Promise(function (resolve) {
                        this._getMarketRegids(sMarket, resolve);
                    }.bind(this)),
                    new Promise(function (resolve) {
                        this._getOriginRegids(sOrigin, resolve);
                    }.bind(this))
                ]).then(function (results) {
                    var aMarketRegids = results[0];
                    var aOriginRegids = results[1];

                    // Find intersection
                    var oMarketSet = Object.create(null);
                    aMarketRegids.forEach(function (sId) {
                        oMarketSet[sId] = true;
                    });

                    var aIntersection = aOriginRegids.filter(function (sId) {
                        return oMarketSet[sId];
                    });

                    this._applyFilterByRegids(oBinding, aIntersection);
                }.bind(this));
            },

            _getMarketRegids: function (sCountryCode, fnCallback) {
                var oModel = this.getView().getModel();
                var sCode = String(sCountryCode).trim().toUpperCase();

                oModel.read("/Z_I_ZREG_COUNTRY", {
                    filters: [
                        new Filter("Role", FilterOperator.EQ, "Target Market"),
                        new Filter("Country_Code", FilterOperator.EQ, sCode)
                    ],
                    urlParameters: {
                        "$select": "Regid",
                        "$top": "5000"
                    },
                    success: function (oData) {
                        var aResults = (oData && oData.results) ? oData.results : [];
                        var aRegids = aResults
                            .map(function (r) { return r && r.Regid ? String(r.Regid) : ""; })
                            .filter(function (x) { return !!x; });
                        fnCallback(aRegids);
                    },
                    error: function (e) {
                        console.error("Z_I_ZREG_COUNTRY market read failed:", e);
                        MessageBox.error("Could not filter regulations for the selected market.");
                        fnCallback([]);
                    }
                });
            },

            _getOriginRegids: function (sCountryCode, fnCallback) {
                var oModel = this.getView().getModel();
                var sCode = String(sCountryCode).trim().toUpperCase();

                oModel.read("/Z_I_ZREG_COUNTRY", {
                    filters: [
                        new Filter("Role", FilterOperator.EQ, "Supplier Origin"),
                        new Filter("Country_Code", FilterOperator.EQ, sCode)
                    ],
                    urlParameters: {
                        "$select": "Regid",
                        "$top": "5000"
                    },
                    success: function (oData) {
                        var aResults = (oData && oData.results) ? oData.results : [];
                        var aRegids = aResults
                            .map(function (r) { return r && r.Regid ? String(r.Regid) : ""; })
                            .filter(function (x) { return !!x; });
                        fnCallback(aRegids);
                    },
                    error: function (e) {
                        console.error("Z_I_ZREG_COUNTRY origin read failed:", e);
                        MessageBox.error("Could not filter regulations for the selected origin.");
                        fnCallback([]);
                    }
                });
            },

            _applyFilterByRegids: function (oBinding, aRegids) {
                if (!aRegids || aRegids.length === 0) {
                    oBinding.filter([new Filter("Id", FilterOperator.EQ, "__NO_MATCH__")]);
                    this._clearSelectionIfNotInRegids(aRegids);
                    return;
                }

                var aIdFilters = aRegids.map(function (sId) {
                    return new Filter("Id", FilterOperator.EQ, sId);
                });

                var oOrFilter = new Filter({ filters: aIdFilters, and: false });
                oBinding.filter([oOrFilter]);
                this._clearSelectionIfNotInRegids(aRegids);
            },

            _clearSelectionIfNotInRegids: function (aRegids) {
                var oUI = this.getOwnerComponent().getModel("ui");
                var sSelectedPath = oUI.getProperty("/selectedRegulationPath");

                if (!sSelectedPath) {
                    return; // No selection to check
                }

                // Extract ID from path (e.g., "/Z_I_ZREGULATION('123')" -> "123")
                var sMatch = sSelectedPath.match(/\('([^']+)'\)/);
                var sSelectedId = sMatch ? sMatch[1] : null;

                if (!sSelectedId) {
                    return;
                }

                // Check if selected ID is in the filtered regids
                var bStillFiltered = aRegids.some(function (sId) {
                    return String(sId) === String(sSelectedId);
                });

                if (!bStillFiltered) {
                    // Selected regulation is no longer in filtered results - clear it
                    oUI.setProperty("/selectedRegulationPath", null);
                    this.byId("detailPanel").setVisible(false);
                    this.byId("regulationList").removeSelections(true);
                }
            },
        });
    }
);
