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

	return Controller.extend("capgeminiappws2025.controller.configurator.ConfiguratorSupplierOrigin", {
        onInit: function () {

            this._initValueHelpModels();
            this._createAddSupplierOriginDialog();

            this._oSupplierOriginFilter = new sap.ui.model.Filter(
                "Role",
                sap.ui.model.FilterOperator.EQ,
                "Supplier Origin"
            );

            this._oSupplierOriginTemplate = new sap.m.ColumnListItem({
                type: "Inactive",
                cells: [
                    new sap.m.Text({ text: "{Country_Code}" }),

                    new sap.m.Button({
                        type: "Reject",
                        icon: "sap-icon://delete",
                        tooltip: "Delete Supplier Origin",
                        press: this.onDeleteSupplierOrigin.bind(this)
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

            this.byId("supplierOriginTable").bindItems({
                path: sPath + "/to_Countries",
                template: this._oSupplierOriginTemplate.clone(),
                templateShareable: false,
                filters: [this._oSupplierOriginFilter]
            });
        },

        onDeleteSupplierOrigin: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext();
            if (!oCtx) {
                return;
            }

            var sPath = oCtx.getPath();
            var oModel = oCtx.getModel();

            MessageBox.confirm("Delete this supplier origin?", {
                title: "Confirm Delete",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oModel.remove(sPath, {
                            success: function () {
                                MessageToast.show("Supplier origin deleted");
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

        onPressAddSupplierOrigin: function () {
            var sRegPath = this.getOwnerComponent().getModel("ui").getProperty("/selectedRegulationPath");
            if (!sRegPath) {
                MessageToast.show("Please select a regulation first.");
                return;
            }

            this._oAddSupplierOriginDialog.open();
        },

        _onConfirmAddSupplierOrigin: async function () {
            var oUI = this.getOwnerComponent().getModel("ui");
            var sRegPath = oUI.getProperty("/selectedRegulationPath");

            if (!sRegPath) {
                MessageToast.show("Select a regulation first.");
                this._oAddSupplierOriginDialog.close();
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
                this._oAddRuleDialog.close();
                return;
            }

            var oRegObj = oRegItem.results ? oRegItem.results[0] : oRegItem;
            var sRegid = oRegObj && oRegObj.Id;
            if (!sRegid) {
                MessageBox.error("Cannot add rule: selected regulation has no Id.");
                return;
            }

            var sCountry = (this.getOwnerComponent().getModel("ui").getProperty("/addSupplierOrigin/country") || "").trim();


            if (!sCountry) {
                this._oSelCountryField.setValueState(sCountry ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this._updateAddSupplierOriginButtonState();
                return;
            }

            var oSupplierOriginTable = this.byId("supplierOriginTable");
            var aExisting = (oSupplierOriginTable.getBinding("items")?.getContexts() || []).map(function (c) {
                return c.getObject();
            });

            var bExists = aExisting.some(function (r) {
                return String(r.Regid) === String(sRegid) &&
                    (r.Country_Code || "").trim() === sCountry;
            });

            if (bExists) {
                MessageBox.warning("This supplier origin already exists for the selected regulation.");
                return;
            }

            var oModel = this.getView().getModel();
            var sCreatePath = "/Z_I_ZREG_COUNTRY";

            var oNewSupplierOrigin = {
                Regid: sRegid,
                Country_Code: sCountry,
                Role: "Supplier Origin"
            };

            this._oAddSupplierOriginDialog.setBusy(true);

            oModel.create(sCreatePath, oNewSupplierOrigin, {
                success: function () {
                    this._oAddSupplierOriginDialog.setBusy(false);
                    this._oAddSupplierOriginDialog.close();
                    MessageToast.show("Supplier Origin added");

                    var oBinding = oSupplierOriginTable.getBinding("items");
                    if (oBinding && oBinding.refresh) {
                        oBinding.refresh(true);
                    }
                }.bind(this),

                error: function (oError) {
                    this._oAddSupplierOriginDialog.setBusy(false);

                    var sMsg = "Failed to add supplier origin.";
                    try {
                        var oBody = JSON.parse(oError.responseText || "{}");
                        sMsg = (oBody.error && oBody.error.message && oBody.error.message.value) || sMsg;
                    } catch (e) { }

                    console.error("Add supplier origin failed:", oError);
                    MessageBox.error(sMsg);
                }.bind(this)
            });
        },

        _createAddSupplierOriginDialog: function () {
            console.log(this.getView().getModel('vhCountry').getProperty("/countries"));
            this._oSelCountryField = new sap.m.ComboBox(this.createId("selCountryField"), {
                width: "100%",
                selectedKey: "{ui>/addSupplierOrigin/country}",
                change: this._onAddSupplierOriginCountryChange.bind(this),
                items: {
                    path: "vhCountry>/countries",
                    template: new sap.ui.core.Item({
                        key: "{vhCountry>Country}",
                        text: "{vhCountry>Country}"
                    }),
                    length: 1000
                }
            });

            this._oAddSupplierOriginDialog = new sap.m.Dialog({
                title: "Add Supplier Origin",
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
                    press: this._onConfirmAddSupplierOrigin.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function () { this._oAddSupplierOriginDialog.close(); }.bind(this)
                }),
                afterOpen: function () {
                    this._updateAddSupplierOriginButtonState();
                }.bind(this),
                afterClose: function () {
                    // reset model state
                    this.getOwnerComponent().getModel("ui").setProperty("/addSupplierOrigin/country", "");

                    // reset controls safely via references
                    this._oSelCountryField.setSelectedKey("");
                    this._updateAddSupplierOriginButtonState();
                }.bind(this)
            });

            this.getView().addDependent(this._oAddSupplierOriginDialog);
        },


        _onAddSupplierOriginCountryChange: function () {
            this._updateAddSupplierOriginButtonState();
        },

        _updateAddSupplierOriginButtonState: function () {
            var oUI = this.getOwnerComponent().getModel("ui");
            var sCountry = (oUI.getProperty("/addSupplierOrigin/country") || "").trim();

            var bValid = !!sCountry;
            var oBtn = this._oAddSupplierOriginDialog && this._oAddSupplierOriginDialog.getBeginButton();
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

                    if (this._oAddSupplierOriginDialog && this._oAddSupplierOriginDialog.isOpen()) {
                        this._updateAddSupplierOriginButtonState();
                    }
                }.bind(this),

                error: function (e) { 
                    console.error("Failed to read Z_I_ZREG_COUNTRY_VH:", e);}
            });
        },
	});
});