sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/mvc/View",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "capgeminiappws2025/utils/CheckAlgorithm",
        "sap/m/ColumnListItem",
        "sap/m/Text"
    ],
    function (
        Controller,
        JSONModel,
        View,
        MessageToast,
        MessageBox,
        CheckAlgorithm, ColumnListItem, Text
    ) {
        "use strict";

        return Controller.extend("capgeminiappws2025.controller.Configurator", {
            onInit: function () {
                this.getView().setModel(
                    new JSONModel({
                        editRegulationId: null,
                        editRuleId: null,
                    }),
                    "ui"
                );
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
                    } catch (e) {}

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
                            } catch (e) {}
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
                        } catch (e) {}
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
                            } catch (e) {}
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
                    // refresh authoritative entity state
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

            onPressStartReadinessCheck: function (oEvent) {
                var oRulesTable = this.byId("rulesTable");
                var aContexts = oRulesTable.getBinding("items").getContexts();
                var aData = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });

                var oModel = this.getView().getModel();
                var oRouter = this.getOwnerComponent().getRouter();

                var oRegulationList = this.byId("regulationList");
                var oSelectedRegulation = oRegulationList
                    .getSelectedItem()
                    .getBindingContext()
                    .getObject();

                var oChecker = new CheckAlgorithm();
                oChecker
                    .do_checking_algorithm(aData, oModel, oSelectedRegulation)
                    .then(function () {
                        oRouter.navTo("ComplianceReport");
                    })
                    .catch(function (oError) {
                        console.error("Readiness check failed:", oError);
                    });
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

            onDeleteRegulation: function () {
                var oList = this.byId("regulationList");
                var aItems = oList.getSelectedItems();

                if (!aItems.length) {
                    sap.m.MessageToast.show("Select at least one regulation to delete.");
                    return;
                }

                sap.m.MessageBox.confirm(
                    "Are you sure you want to delete this regulation?",
                    {
                        actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                        onClose: function (sAction) {
                            if (sAction !== sap.m.MessageBox.Action.OK) {
                                return;
                            }

                            var oModel = this.getView().getModel();
                            this.getView().setBusy(true);

                            aItems.forEach(function (oItem) {
                                var oCtx = oItem.getBindingContext();
                                if (oCtx) {
                                    oModel.remove(oCtx.getPath()); // queues DELETE in $batch
                                }
                            });

                            oModel.submitChanges({
                                success: function () {
                                    this.getView().setBusy(false);
                                    sap.m.MessageToast.show("Deleted.");

                                    // refresh list + clear selection
                                    oModel.refresh(true);
                                    oList.removeSelections(true);

                                    // hide/clear right-side detail area (optional but recommended)
                                    var oPanel = this.byId("detailPanel");
                                    if (oPanel) {
                                        oPanel.setVisible(false);
                                        oPanel.unbindElement(undefined);
                                    }
                                }.bind(this),
                                error: function () {
                                    this.getView().setBusy(false);
                                    sap.m.MessageBox.error("Delete failed.");
                                }.bind(this)
                            });
                        }.bind(this)
                    }
                );
            }
        });
    }
);
