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

	return Controller.extend("capgeminiappws2025.controller.configurator.ConfiguratorTargetMarket", {
        onInit: function () {
            this._initValueHelpModels();
            this._createAddTargetMarketDialog();

            this._oTargetMarketFilter = new sap.ui.model.Filter(
                "Role",
                sap.ui.model.FilterOperator.EQ,
                "Target Market"
            );

            this._oTargetMarketTemplate = new sap.m.ColumnListItem({
                type: "Inactive",
                cells: [
                    new sap.m.Text({ text: "{Country_Code}" }),

                    new sap.m.Button({
                        type: "Reject",
                        icon: "sap-icon://delete",
                        tooltip: "Delete Target Market",
                        press: this.onDeleteTargetMarket.bind(this)
                    })
                ]
                });

            const oUiModel = new sap.ui.model.json.JSONModel({
                selectedRegulationPath: null
            });

            this._oBinding = this.getOwnerComponent().getModel("ui").bindProperty("/selectedRegulationPath");
            this._oBinding.attachChange(this._onRegulationChanged, this);
        },

        _onRegulationChanged: function (oEvent) {
            const sPath = this._oBinding.getValue();

            this.byId("targetMarketTable").bindItems({
                path: sPath + "/to_Countries",
                template: this._oTargetMarketTemplate.clone(),
                templateShareable: false,
                filters: [this._oTargetMarketFilter]
            });
        },

        onDeleteTargetMarket: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext();
            if (!oCtx) {
                return;
            }

            var sPath = oCtx.getPath();
            var oModel = oCtx.getModel();

            MessageBox.confirm("Delete this target market?", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oModel.remove(sPath, {
                            success: function () {
                                MessageToast.show("Target market deleted");
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

        onPressAddTargetMarket: function () {
            var sRegPath = this.getOwnerComponent().getModel("ui").getProperty("/selectedRegulationPath");
            if (!sRegPath) {
                MessageToast.show("Please select a regulation first.");
                return;
            }

            this._oAddTargetMarketDialog.open();
        },

        _onConfirmAddTargetMarket: async function () {
            var oUI = this.getOwnerComponent().getModel("ui");
            var sRegPath = oUI.getProperty("/selectedRegulationPath");

            if (!sRegPath) {
                MessageToast.show("Select a regulation first.");
                this._oAddTargetMarketDialog.close();
                return;
            }

            var oRegItem = await new Promise(function (resolve) {
                this.getView().getModel().read(sRegPath, {
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function () {
                        resolve(null);
                    }
                });
            }.bind(this));
            if (!oRegItem) {
                MessageToast.show("Select a regulation first.");
                this._oAddTargetMarketDialog.close();
                return;
            }

            var oRegObj = oRegItem.results ? oRegItem.results[0] : oRegItem;
            var sRegid = oRegObj && oRegObj.Id;
            if (!sRegid) {
                MessageBox.error("Cannot add target market: selected regulation has no Id.");
                return;
            }

            var sCountry = (this.getOwnerComponent().getModel("ui").getProperty("/addTargetMarket/country") || "").trim();


            if (!sCountry) {
                this._oSelCountryField.setValueState(sCountry ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this._updateAddTargetMarketButtonState();
                return;
            }

            var oTargetMarketTable = this.byId("targetMarketTable");
            var aExisting = (oTargetMarketTable.getBinding("items")?.getContexts() || []).map(function (c) {
                return c.getObject();
            });

            var bExists = aExisting.some(function (r) {
                return String(r.Regid) === String(sRegid) &&
                    (r.Country_Code || "").trim() === sCountry;
            });

            if (bExists) {
                MessageBox.error("This target market already exists for the selected regulation.");
                return;
            }

            var oModel = this.getView().getModel();
            var sCreatePath = "/Z_I_ZREG_COUNTRY";

            var oNewTargetMarket = {
                Regid: sRegid,
                Country_Code: sCountry,
                Role: "Target Market"
            };

            this._oAddTargetMarketDialog.setBusy(true);

            oModel.create(sCreatePath, oNewTargetMarket, {
                success: function () {
                    this._oAddTargetMarketDialog.setBusy(false);
                    this._oAddTargetMarketDialog.close();
                    MessageToast.show("Target Market added");
                    var oBinding = oTargetMarketTable.getBinding("items");
                    if (oBinding && oBinding.refresh) {
                        oBinding.refresh(true);
                    }
                }.bind(this),

                error: function (oError) {
                    this._oAddTargetMarketDialog.setBusy(false);

                    var sMsg = "Failed to add target market.";
                    try {
                        var oBody = JSON.parse(oError.responseText || "{}");
                        sMsg = (oBody.error && oBody.error.message && oBody.error.message.value) || sMsg;
                    } catch (e) { }

                    console.error("Add target market failed:", oError);
                    MessageBox.error(sMsg);
                }.bind(this)
            });
        },

        _createAddTargetMarketDialog: function () {
            this._oSelCountryField = new sap.m.ComboBox(this.createId("selCountryField"), {
                width: "100%",
                selectedKey: "{ui>/addTargetMarket/country}",
                change: this._onAddTargetMarketCountryChange.bind(this),
                items: {
                    path: "vhCountry>/countries",
                    template: new sap.ui.core.Item({
                        key: "{vhCountry>Country}",
                        text: "{vhCountry>Country}"
                    }),
                    length: 1000
                }
            });

            this._oAddTargetMarketDialog = new sap.m.Dialog({
                title: "Add Target Market",
                type: sap.m.DialogType.Standard,
                contentWidth: "18rem",
                horizontalScrolling: false,
                verticalScrolling: true,
                content: [
                    new sap.m.VBox({
                        width: "100%",
                        items: [
                            new sap.m.Label({ text: "Country", required: true, labelFor: this._oSelCountryField }),
                            this._oSelCountryField
                        ]
                    }).addStyleClass("sapUiContentPadding")
                ],
                beginButton: new sap.m.Button({
                    text: "Add",
                    type: sap.m.ButtonType.Emphasized,
                    enabled: false,
                    press: this._onConfirmAddTargetMarket.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function () { this._oAddTargetMarketDialog.close(); }.bind(this)
                }),
                afterOpen: function () {
                    this._updateAddTargetMarketButtonState();
                }.bind(this),
                afterClose: function () {
                    // reset model state
                    this.getOwnerComponent().getModel("ui").setProperty("/addTargetMarket/country", "");

                    // reset controls safely via references
                    this._oSelCountryField.setSelectedKey("");
                    this._updateAddTargetMarketButtonState();
                }.bind(this)
            });

            this.getView().addDependent(this._oAddTargetMarketDialog);
        },


        _onAddTargetMarketCountryChange: function () {
            this._updateAddTargetMarketButtonState();
        },

        _updateAddTargetMarketButtonState: function () {
            var oUI = this.getOwnerComponent().getModel("ui");
            var sCountry = (oUI.getProperty("/addTargetMarket/country") || "").trim();

            var bValid = !!sCountry;
            var oBtn = this._oAddTargetMarketDialog && this._oAddTargetMarketDialog.getBeginButton();
            if (oBtn) oBtn.setEnabled(bValid);
        },

        _initValueHelpModels: function () {
            var oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                console.error("ODataModel not available on Component");
                return;
            }

            this.getView().setModel(new sap.ui.model.json.JSONModel({ countries: [] }), "vhCountry");

            oModel.read("/Z_I_ZREG_COUNTRY_VH", {
                urlParameters: {
                        "$top": 1000
                    },
                success: function (oData) {
                    var aRows = (oData && oData.results) ? oData.results : [];

                    this.getView().getModel("vhCountry").setProperty("/rows", aRows);

                    var mSeen = Object.create(null);
                    var aCountries = [];
                    aRows.forEach(function (r) {
                        var sV = (r.Country_Code || "").trim();
                        if (!sV || mSeen[sV]) return;
                        mSeen[sV] = true;
                        aCountries.push({ Country: sV });
                    });
                    aCountries.sort(function (a, b) { return a.Country.localeCompare(b.Country); });

                    this.getView().getModel("vhCountry").setProperty("/countries", aCountries);

                    if (this._oAddTargetMarketDialog && this._oAddTargetMarketDialog.isOpen()) {
                        this._updateAddTargetMarketButtonState();
                    }
                }.bind(this),

                error: function (e) { 
                    console.error("Failed to read Z_I_ZREG_COUNTRY_VH:", e);}
            });
        },
	});
});