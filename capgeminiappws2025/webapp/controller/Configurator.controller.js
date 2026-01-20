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
    "sap/m/VBox"
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
    VBox
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
        this._busyDialog = new BusyDialog({
          title: "Starting Readiness Check",
          content: new VBox({
            items: [
              new Text({ text: "Starting Readiness Check..." })
            ]
          })
        });        
      },

      /**
       * @override
       * @returns {void|undefined}
       */
      onExit: function() {
        this._busyDialog?.destroy();
        this._busyDialog = null;
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

      onSelectRegulation: function (oEvent) {
        var oSelectedItem = oEvent.getParameter("listItem");
        var oContext = oSelectedItem.getBindingContext();
        var sPath = oContext.getPath();

        var oRulesTable = this.byId("rulesTable");
        oRulesTable.bindItems({
          path: sPath + "/to_Fields",
          template: oRulesTable.getItems()[0].clone(),
        });

        this.byId("detailPanel").setVisible(true);
      },

      onPressAddRegulation: function () {
        /* add regulation logic */
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
    });
  }
);
