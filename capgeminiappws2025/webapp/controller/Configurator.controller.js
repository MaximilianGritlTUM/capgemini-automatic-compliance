sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/View",
	"capgeminiappws2025/utils/CheckAlgorithm",
    "sap/m/ColumnListItem",
    "sap/m/Text"
], function (Controller,
	JSONModel,
	View,
	CheckAlgorithm, ColumnListItem, Text) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.Configurator", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("configurator")
                .attachPatternMatched(this._onRouteMatched, this);
             this._oFieldTemplate = new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({ text: "{Viewname}" }),
                    new sap.m.Text({ text: "{Elementname}" })
                ]
            });    
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

            this.byId("detailPanel").bindElement({ path: sPath });
            this.byId("detailPanel").setVisible(true);

            console.log("Selected Regulation Path:", sPath);

            var oRulesTable = this.byId("rulesTable");
            console.log("Rules Table:", oRulesTable);

            oRulesTable.bindItems({ 
                path: sPath + "/to_Fields",
                template: this._oFieldTemplate,
                templateSharable: true 
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

        onPressAddRule: function (oEvent) {
            // Logic to add a new rule
        },

        onPressSaveConfiguration: function (oEvent) {
            // Logic to save a configuraytion
        },

        onPressStartReadinessCheck: function (oEvent) {
            // Logic to test results
            var oRulesTable = this.byId("rulesTable");
            var aContexts = oRulesTable.getBinding('items').getContexts();

            var aData = aContexts.map(function(oContext) {
                return oContext.getObject();
            });

            var oModel = this.getView().getModel();
            var oRouter = this.getOwnerComponent().getRouter();

            var oRegulationList = this.byId("regulationList");
            var oSelectedRegulation = oRegulationList.getSelectedItem().getBindingContext().getObject();

            var oChecker = new CheckAlgorithm();

            oChecker.do_checking_algorithm(aData, oModel, oSelectedRegulation).then(function() {
                oRouter.navTo("ComplianceReport");
            }).catch(function(oError) {
                console.error("Readiness check or report creation failed:", oError);
            });
        },
        onDeleteRegulation: function () {
            var oList = this.byId("regulationList");
            var aItems = oList.getSelectedItems();

            if (!aItems.length) {
                sap.m.MessageToast.show("Select at least one regulation to delete.");
                return;
            }

            sap.m.MessageBox.confirm(
                "Are you sure you want to delete regulation?",
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
        },
    });
});
