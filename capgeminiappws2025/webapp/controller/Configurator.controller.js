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
                        selectedRegulationPath: null,
                        addRule: {
                            view: "",
                            element: ""
                        }
                    }),
                    "ui"
                );

                this._createAddRuleDialog();

                this._initValueHelpModels(); //avoiding duplicates

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

                this.getView().getModel("ui").setProperty("/selectedRegulationPath", oContext.getPath());


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

                oModel.setProperty(oContext.getPath() + "/Id", "");

                oRouter.navTo("Regulation", {
                    contextPath: encodeURIComponent(oContext.getPath())
                });
            },

            onPressAddRule: function () {
                var sRegPath = this.getView().getModel("ui").getProperty("/selectedRegulationPath");
                if (!sRegPath) {
                    MessageToast.show("Please select a regulation first.");
                    return;
                }

                this._oAddRuleDialog.open();
            },

            _onConfirmAddRule: function () {
                var oUI = this.getView().getModel("ui");
                var sRegPath = oUI.getProperty("/selectedRegulationPath");

                if (!sRegPath) {
                    MessageToast.show("Select a regulation first.");
                    this._oAddRuleDialog.close();
                    return;
                }

                var oRegItem = this.byId("regulationList").getSelectedItem();
                if (!oRegItem) {
                    MessageToast.show("Select a regulation first.");
                    this._oAddRuleDialog.close();
                    return;
                }

                var oRegObj = oRegItem.getBindingContext().getObject();
                var sRegid = oRegObj && oRegObj.Id;
                if (!sRegid) {
                    MessageBox.error("Cannot add rule: selected regulation has no Id.");
                    return;
                }

                var sView = (this.getView().getModel("ui").getProperty("/addRule/view") || "").trim();
                var sField = (this.getView().getModel("ui").getProperty("/addRule/element") || "").trim();


                if (!sView || !sField) {
                    this._oSelRuleView.setValueState(sView ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                    this._oSelRuleField.setValueState(sField ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                    this._updateAddRuleButtonState();
                    return;
                }

                var oRulesTable = this.byId("rulesTable");
                var aExisting = (oRulesTable.getBinding("items")?.getContexts() || []).map(function (c) {
                    return c.getObject();
                });

                var bExists = aExisting.some(function (r) {
                    return String(r.Regid) === String(sRegid) &&
                        (r.Viewname || "").trim() === sView &&
                        (r.Elementname || "").trim() === sField;
                });

                if (bExists) {
                    MessageBox.warning("This rule already exists for the selected regulation.");
                    return;
                }

                var oModel = this.getView().getModel();
                var sCreatePath = "/Z_I_ZREG_FIELDS";

                var oNewRule = {
                    Regid: sRegid,
                    Viewname: sView,
                    Elementname: sField,
                    Active: true
                };

                this._oAddRuleDialog.setBusy(true);

                oModel.create(sCreatePath, oNewRule, {
                    success: function () {
                        this._oAddRuleDialog.setBusy(false);
                        this._oAddRuleDialog.close();
                        MessageToast.show("Rule added");

                        var oBinding = oRulesTable.getBinding("items");
                        if (oBinding && oBinding.refresh) {
                            oBinding.refresh(true);
                        }
                    }.bind(this),

                    error: function (oError) {
                        this._oAddRuleDialog.setBusy(false);

                        var sMsg = "Failed to add rule.";
                        try {
                            var oBody = JSON.parse(oError.responseText || "{}");
                            sMsg = (oBody.error && oBody.error.message && oBody.error.message.value) || sMsg;
                        } catch (e) { }

                        console.error("Add rule failed:", oError);
                        MessageBox.error(sMsg);
                    }.bind(this)
                });
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

            _createAddRuleDialog: function () {
                this._oSelRuleView = new sap.m.Select(this.createId("selRuleView"), {
                    width: "100%",
                    selectedKey: "{ui>/addRule/view}",
                    change: this._onAddRuleViewChange.bind(this),
                    items: {
                        path: "vhViews>/views",
                        template: new sap.ui.core.Item({
                            key: "{vhViews>Viewname}",
                            text: "{vhViews>Viewname}"
                        })
                    }
                });

                this._oSelRuleField = new sap.m.Select(this.createId("selRuleField"), {
                    width: "100%",
                    selectedKey: "{ui>/addRule/element}",
                    enabled: "{= ${ui>/addRule/view} ? true : false }",
                    change: this._onAddRuleElementChange.bind(this),
                    items: {
                        path: "/Z_I_ZREG_FIELDS_VH",
                        template: new sap.ui.core.Item({
                            key: "{Elementname}",
                            text: "{Elementname}"
                        })
                    }
                });

                this._oAddRuleDialog = new sap.m.Dialog({
                    title: "Add Rule",
                    type: sap.m.DialogType.Standard,
                    contentWidth: "18rem",
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    content: [
                        new sap.m.VBox({
                            width: "100%",
                            items: [
                                new sap.m.Label({ text: "View", required: true, labelFor: this._oSelRuleView }),
                                this._oSelRuleView,
                                new sap.m.Label({ text: "Field", required: true, labelFor: this._oSelRuleField }),
                                this._oSelRuleField
                            ]
                        }).addStyleClass("sapUiContentPadding")
                    ],
                    beginButton: new sap.m.Button({
                        text: "Add",
                        type: sap.m.ButtonType.Emphasized,
                        enabled: false,
                        press: this._onConfirmAddRule.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () { this._oAddRuleDialog.close(); }.bind(this)
                    }),
                    afterOpen: function () {
                        this._applyElementFilter();
                        this._updateAddRuleButtonState();
                    }.bind(this),
                    afterClose: function () {
                        // reset model state
                        this.getView().getModel("ui").setProperty("/addRule/view", "");
                        this.getView().getModel("ui").setProperty("/addRule/element", "");

                        // reset controls safely via references
                        this._oSelRuleView.setSelectedKey("");
                        this._oSelRuleField.setSelectedKey("");

                        this._updateAddRuleButtonState();
                    }.bind(this)
                });

                this.getView().addDependent(this._oAddRuleDialog);
            },


            _onAddRuleViewChange: function () {
                var oUI = this.getView().getModel("ui");
                var sView = (oUI.getProperty("/addRule/view") || "").trim();

                oUI.setProperty("/addRule/element", "");

                if (this._oSelRuleField) {
                    this._oSelRuleField.setSelectedKey("");
                    this._oSelRuleField.setValueState(sap.ui.core.ValueState.None);
                }
                if (this._oSelRuleView) {
                    this._oSelRuleView.setValueState(sView ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                }

                this._applyElementFilter();
                this._updateAddRuleButtonState();
            },

            _onAddRuleElementChange: function () {
                var oUI = this.getView().getModel("ui");
                var sElem = (oUI.getProperty("/addRule/element") || "").trim();

                if (this._oSelRuleField) {
                    this._oSelRuleField.setValueState(sElem ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                }

                this._updateAddRuleButtonState();
            },


            _applyElementFilter: function () {
                var sView = this.getView().getModel("ui").getProperty("/addRule/view");

                if (!this._oSelRuleField) return;

                var oBinding = this._oSelRuleField.getBinding("items");
                if (!oBinding) return;

                if (!sView) {
                    oBinding.filter([]);
                    return;
                }

                oBinding.filter([
                    new sap.ui.model.Filter("Viewname", sap.ui.model.FilterOperator.EQ, sView)
                ]);
            },


            _updateAddRuleButtonState: function () {
                var oUI = this.getView().getModel("ui");
                var sView = (oUI.getProperty("/addRule/view") || "").trim();
                var sElem = (oUI.getProperty("/addRule/element") || "").trim();

                var bValid = !!sView && !!sElem;
                var oBtn = this._oAddRuleDialog && this._oAddRuleDialog.getBeginButton();
                if (oBtn) oBtn.setEnabled(bValid);
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

            _initValueHelpModels: function () {
                var oModel = this.getOwnerComponent().getModel();
                if (!oModel) {
                    console.error("ODataModel not available on Component");
                    return;
                }
                var oUI = this.getView().getModel("ui");

                this.getView().setModel(new sap.ui.model.json.JSONModel({ views: [] }), "vhViews");
                this.getView().setModel(new sap.ui.model.json.JSONModel({ rows: [] }), "vhFields");

                oModel.read("/Z_I_ZREG_FIELDS_VH", {
                    success: function (oData) {
                        var aRows = (oData && oData.results) ? oData.results : [];

                        this.getView().getModel("vhFields").setProperty("/rows", aRows);

                        var mSeen = Object.create(null);
                        var aViews = [];
                        aRows.forEach(function (r) {
                            var sV = (r.Viewname || "").trim();
                            if (!sV || mSeen[sV]) return;
                            mSeen[sV] = true;
                            aViews.push({ Viewname: sV });
                        });
                        aViews.sort(function (a, b) { return a.Viewname.localeCompare(b.Viewname); });

                        this.getView().getModel("vhViews").setProperty("/views", aViews);

                        if (this._oAddRuleDialog && this._oAddRuleDialog.isOpen()) {
                            this._applyElementFilter();
                            this._updateAddRuleButtonState();
                        }
                    }.bind(this),

                    error: function (e) { console.error("Failed to read Z_I_ZREG_FIELDS_VH:", e); }
                });
            },

        });
    }
);
