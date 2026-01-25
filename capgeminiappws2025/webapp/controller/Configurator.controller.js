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

        return Controller.extend("capgeminiappws2025.controller.Configurator", {
            onInit: function () {
                this.getView().setModel(
                    new JSONModel({
                        editRegulationId: null,
                        editRuleId: null,
                        selectedMarket: ""
                    }),
                    "ui"
                );

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
                this._oFieldTemplate = new sap.m.ColumnListItem({
                    type: "Inactive",
                    cells: [
                        new sap.m.Text({ text: "{Viewname}" }),
                        new sap.m.Text({ text: "{Elementname}" }),

                        new sap.m.Switch({
                            state: "{Active}",
                            customTextOn: "ON",
                            customTextOff: "OFF",
                            change: this.onRuleActiveChange.bind(this)
                        }),

                        new sap.m.Button({
                            type: "Reject",
                            icon: "sap-icon://delete",
                            tooltip: "Delete Rule",
                            press: this.onDeleteRule.bind(this)
                        })
                    ]
                });
            },

            onDeleteRegulation: function (oEvent) {
                var oSource = oEvent.getSource();
                var oCtx = oSource.getBindingContext();
                if (!oCtx) {
                    return;
                }

                var sPath = oCtx.getPath();
                var oModel = oCtx.getModel();

                MessageBox.confirm("Delete this regulation?", {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oModel.remove(sPath, {
                                success: function () {
                                    MessageToast.show("Regulation deleted");
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

                this.getView().getModel("ui").setProperty("/editRegulationId", null);
            },

            _onRouteMatched: function () {
                var oList = this.byId("regulationList");
                var oBinding = oList.getBinding("items");
                if (oBinding) {
                    oBinding.refresh(true);
                } else {
                    this.getView().getModel().refresh(true);
                }
            },

            onSelectRegulation: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oContext = oSelectedItem.getBindingContext(); // default model
                if (!oContext) {
                    return;
                }
                var sPath = oContext.getPath();

                var oRulesTable = this.byId("rulesTable");
                oRulesTable.bindItems({
                    path: sPath + "/to_Fields",
                    template: this._oFieldTemplate.clone(),
                    templateShareable: false
                });

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

                oModel.setProperty("Id", "", oContext);

                oRouter.navTo("Regulation", {
                    contextPath: encodeURIComponent(oContext.getPath())
                });
            },

            onPressAddRule: function () {
                /* add rule logic */
            },

            onPressSaveConfiguration: function () {
                /* save config logic */
            },

            onPressStartReadinessCheck: async function () {
                this._busyDialog.open();

                await new Promise((r) => setTimeout(r, 0));

                try {
                    var oRulesTable = this.byId("rulesTable");
                    var oBinding = oRulesTable.getBinding("items");
                    var aContexts = oBinding ? oBinding.getContexts() : [];
                    var aData = aContexts.map(function (oContext) {
                        return oContext.getObject();
                    });

                    var oModel = this.getView().getModel();
                    var oRouter = this.getOwnerComponent().getRouter();

                    var oRegulationList = this.byId("regulationList");
                    var oSelectedItem = oRegulationList.getSelectedItem();
                    if (!oSelectedItem) {
                        throw new Error("No regulation selected.");
                    }
                    var oSelectedRegulation = oSelectedItem.getBindingContext().getObject();

                    var oChecker = new CheckAlgorithm();

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


            onSubmitRuleField: function (oEvent) {
                var oSource = oEvent.getSource();
                var oCtx = oSource.getBindingContext();
                if (!oCtx) {
                    this.getView().getModel("ui").setProperty("/editRuleId", null);
                    return;
                }

                var oModel = oCtx.getModel();
                var sPath = oCtx.getPath();

                var oValueBinding = oSource.getBinding && oSource.getBinding("value");
                var oStateBinding = oSource.getBinding && oSource.getBinding("state");
                var sProp, vNew;

                if (oValueBinding) {
                    sProp = oValueBinding.getPath();
                    vNew = ((oSource.getValue && oSource.getValue()) || "").trim();
                } else if (oStateBinding) {
                    sProp = oStateBinding.getPath();
                    vNew = !!oSource.getState();
                } else {
                    this.getView().getModel("ui").setProperty("/editRuleId", null);
                    return;
                }

                oModel.setProperty(sPath + "/" + sProp, vNew);

                if (typeof oModel.submitChanges === "function") {
                    oModel.submitChanges({
                        success: function () {
                            MessageToast.show("Rule updated");
                        },
                        error: function (oError) {
                            console.error("Rule submit failed:", oError);
                            MessageToast.show("Update failed");
                        },
                    });
                } else if (typeof oModel.update === "function") {
                    var payload = {};
                    payload[sProp] = vNew;
                    oModel.update(sPath, payload, {
                        method: "MERGE",
                        success: function () {
                            MessageToast.show("Rule updated");
                        },
                        error: function (oErr) {
                            console.error("update error:", oErr);
                            MessageToast.show("Update failed");
                        },
                    });
                }

                this.getView().getModel("ui").setProperty("/editRuleId", null);
            },

            onDeleteRule: function (oEvent) {
                var oSource = oEvent.getSource();
                var oCtx = oSource.getBindingContext();
                if (!oCtx) {
                    return;
                }

                var sPath = oCtx.getPath();
                var oModel = oCtx.getModel();

                MessageBox.confirm("Delete this rule?", {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oModel.remove(sPath, {
                                success: function () {
                                    MessageToast.show("Rule deleted");
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

            onRuleActiveChange: function (oEvent) {
                var oSwitch = oEvent.getSource();
                var oCtx = oSwitch.getBindingContext();
                if (!oCtx) {
                    return;
                }

                var bState = oEvent.getParameter("state");
                var oModel = oCtx.getModel();
                var sPath = oCtx.getPath();

                // Update local property (keeps UI consistent)
                oModel.setProperty(sPath + "/Active", bState);

                // Persist depending on model type
                if (typeof oModel.submitChanges === "function") {
                    oModel.submitChanges({
                        error: function (e) { console.error("Active update failed:", e); }
                    });
                } else if (typeof oModel.update === "function") {
                    oModel.update(sPath, { Active: bState }, {
                        method: "MERGE",
                        error: function (e) { console.error("Active update failed:", e); }
                    });
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

                MessageBox.confirm("Are you sure about deleting regulation \"" + sTitle + "\"?", {
                    title: "Confirm Delete",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oModel.remove(sPath, {
                                success: function () {
                                    MessageToast.show("Regulation deleted");
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
                    title: "Select Target Market",

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

                        this.getView().getModel("ui").setProperty("/selectedMarket", sCode);
                        this._applyMarketFilterV2(sCode);
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
                this.getView().getModel("ui").setProperty("/selectedMarket", "");
                this._applyMarketFilterV2("");
            },
            
            _loadDistinctMarketsV2: function () {
                var oModel = this.getView().getModel();

                return new Promise(function (resolve, reject) {
                    if (!oModel || typeof oModel.read !== "function") {
                        reject(new Error("OData V2 model missing or read() not available."));
                        return;
                    }

                    oModel.read("/Z_I_ZREG_COUNTRY", {
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


            _applyMarketFilterV2: function (sCountryCode) {
                var oList = this.byId("regulationList");
                var oBinding = oList && oList.getBinding("items");
                var oModel = this.getView().getModel();

                if (!oBinding) {
                    MessageBox.error("Regulation list binding not found. Expected List id='regulationList' with aggregation 'items'.");
                    return;
                }

                // Clear filter
                if (!sCountryCode) {
                    oBinding.filter([]);
                    return;
                }

                var sCode = String(sCountryCode).trim().toUpperCase();

                // 1) Get all Regid values for the selected Country_Code
                oModel.read("/Z_I_ZREG_COUNTRY", {
                    filters: [new Filter("Country_Code", FilterOperator.EQ, sCode)],
                    urlParameters: {
                        "$select": "Regid",
                        "$top": "5000"
                    },
                    success: function (oData) {
                        var aResults = (oData && oData.results) ? oData.results : [];
                        var aRegids = aResults
                            .map(function (r) { return r && r.Regid ? String(r.Regid) : ""; })
                            .filter(function (x) { return !!x; });

                        // No match -> force empty
                        if (aRegids.length === 0) {
                            oBinding.filter([new Filter("Id", FilterOperator.EQ, "__NO_MATCH__")]);
                            return;
                        }

                        // 2) OR filter on regulation Id
                        var aIdFilters = aRegids.map(function (sId) {
                            return new Filter("Id", FilterOperator.EQ, sId);
                        });

                        var oOrFilter = new Filter({ filters: aIdFilters, and: false });

                        oBinding.filter([oOrFilter]);
                    },
                    error: function (e) {
                        console.error("Z_I_ZREG_COUNTRY read failed:", e);
                        MessageBox.error("Could not filter regulations for the selected market.");
                    }
                });
            }

        });
    }
);
