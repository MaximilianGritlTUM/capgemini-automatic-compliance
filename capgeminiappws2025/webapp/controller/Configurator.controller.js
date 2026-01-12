sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/View",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "capgeminiappws2025/utils/CheckAlgorithm",
  ],
  function (Controller, JSONModel, View, MessageToast, MessageBox, CheckAlgorithm) {
    "use strict";

    return Controller.extend("capgeminiappws2025.controller.Configurator", {
      onInit: function () {
        this.getView().setModel(
          new sap.ui.model.json.JSONModel({
            editRegulationId: null,
          }),
          "ui"
        );
      },

      onDeleteRegulation: function (oEvent) {
        var oSource = oEvent.getSource();
        var oCtx = oSource.getBindingContext();
        if (!oCtx) {
          return;
        }

        var sPath = oCtx.getPath(); // e.g. /Z_I_ZREGULATION('0000000002')
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
        const oCtx = oEvent.getSource().getBindingContext();
        const sRegulationId = oCtx.getProperty("Id");

        this.getView()
          .getModel("ui")
          .setProperty("/editRegulationId", sRegulationId);

        // focus input inside the matching list item
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
            if (oItem) {
              var aContent =
                (oItem.getContent && oItem.getContent()) ||
                (oItem.getCells && oItem.getCells()) ||
                [];
              var oInput = aContent.find(function (c) {
                return c && c.isA && c.isA("sap.m.Input");
              });
              if (oInput) {
                try {
                  oInput.focus();
                } catch (e) {
                  /* ignore */
                }
                // Attach per-instance handlers once so only this input controls edit mode
                if (!oInput._bEditHandlersAttached) {
                  // blur / focusout: always exit edit mode (do not depend on value change)
                  oInput._fnFocusOut = function () {
                    this.getView()
                      .getModel("ui")
                      .setProperty("/editRegulationId", null);
                  }.bind(this);
                  oInput.attachBrowserEvent("focusout", oInput._fnFocusOut);

                  // Enter key: schedule exit so submit handler (if bound) can run first
                  oInput._fnKeydown = function (oBrowserEvent) {
                    if (
                      oBrowserEvent.key === "Enter" ||
                      oBrowserEvent.keyCode === 13
                    ) {
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
                  oInput.attachBrowserEvent("keydown", oInput._fnKeydown);

                  // mark attached
                  oInput._bEditHandlersAttached = true;

                  // cleanup when control is destroyed (optional)
                  oInput.addEventDelegate({
                    onBeforeRendering: function () {
                      if (oInput.bIsDestroyed) {
                        return;
                      }
                    },
                    onAfterRendering: function () {
                      if (
                        oInput.bIsDestroyed &&
                        oInput._bEditHandlersAttached
                      ) {
                        try {
                          oInput.detachBrowserEvent(
                            "focusout",
                            oInput._fnFocusOut
                          );
                          oInput.detachBrowserEvent(
                            "keydown",
                            oInput._fnKeydown
                          );
                        } catch (e) {}
                        oInput._bEditHandlersAttached = false;
                      }
                    },
                  });
                }
              }
            }
          }.bind(this),
          0
        );
      },

      onSubmitRegulationTitle: function (oEvent) {
        const oInput = oEvent.getSource();
        const oCtx = oInput.getBindingContext();
        if (!oCtx) {
          return;
        }

        const oModel = oCtx.getModel();
        const sPath = oCtx.getPath();
        var sValue = oInput.getValue();

        function getPropertyMaxLength(oModel, sEntitySetName, sPropName) {
          var oMeta = oModel.getServiceMetadata();
          if (!oMeta || !oMeta.dataServices || !oMeta.dataServices.schema) {
            return null;
          }
          var aSchemas = Array.isArray(oMeta.dataServices.schema)
            ? oMeta.dataServices.schema
            : [oMeta.dataServices.schema];

          // Find entitySet -> entityType
          var sEntityTypeFull = null;
          for (var si = 0; si < aSchemas.length && !sEntityTypeFull; si++) {
            var oSchema = aSchemas[si];
            var oContainer =
              oSchema.entityContainer && oSchema.entityContainer[0];
            if (!oContainer || !oContainer.entitySet) {
              continue;
            }
            var aEntitySets = Array.isArray(oContainer.entitySet)
              ? oContainer.entitySet
              : [oContainer.entitySet];
            for (var ei = 0; ei < aEntitySets.length; ei++) {
              var oES = aEntitySets[ei];
              if (oES.name === sEntitySetName) {
                sEntityTypeFull = oES.entityType; // e.g. Namespace.EntityType
                break;
              }
            }
          }
          if (!sEntityTypeFull) {
            return null;
          }

          var sTypeName = sEntityTypeFull.split(".").pop();

          // Find entityType definition and property
          for (var sj = 0; sj < aSchemas.length; sj++) {
            var oSchema2 = aSchemas[sj];
            var aEntityTypes = oSchema2.entityType
              ? Array.isArray(oSchema2.entityType)
                ? oSchema2.entityType
                : [oSchema2.entityType]
              : [];
            for (var ti = 0; ti < aEntityTypes.length; ti++) {
              var oET = aEntityTypes[ti];
              if (oET.name === sTypeName) {
                var aProps = oET.property
                  ? Array.isArray(oET.property)
                    ? oET.property
                    : [oET.property]
                  : [];
                for (var pi = 0; pi < aProps.length; pi++) {
                  var oP = aProps[pi];
                  if (oP.name === sPropName) {
                    return oP.maxLength ? parseInt(oP.maxLength, 10) : null;
                  }
                }
              }
            }
          }
          return null;
        }

        // Determine entity set name used by the list (match your backend entity set name)
        var sEntitySetName = "Z_I_ZREGULATION";

        // check metadata for Title maxLength
        var iMax = getPropertyMaxLength(oModel, sEntitySetName, "Title");
        if (iMax && sValue && sValue.length > iMax) {
          sap.m.MessageToast.show(
            "Title exceeds maxLength (" + iMax + "), truncating client-side."
          );
          sValue = sValue.substring(0, iMax);
        }

        // Optionally sanitize/trim input
        sValue = sValue && sValue.trim();

        // Apply edited value to the OData entity before submit
        oModel.setProperty(sPath + "/Title", sValue);

        if (oModel.hasPendingChanges && oModel.hasPendingChanges()) {
          oModel.submitChanges({
            success: () => {
              sap.m.MessageToast.show("Regulation updated");
            },
            error: function (oError) {
              // log server response for debugging
              console.error("Submit failed:", oError);
              // also inspect network tab response body to see detailed facet message
            },
          });
        }

        // Exit edit mode
        this.getView().getModel("ui").setProperty("/editRegulationId", null);
      },

      onSelectRegulation: function (oEvent) {
        var oSelectedItem = oEvent.getParameter("listItem");
        var oContext = oSelectedItem.getBindingContext(); // default model
        var sPath = oContext.getPath();

        var oRulesTable = this.byId("rulesTable");

        oRulesTable.bindItems({
          path: sPath + "/to_Fields",
          template: oRulesTable.getItems()[0].clone(), // Clone first item as template
        });

        this.byId("detailPanel").setVisible(true);
      },

      onPressAddRegulation: function (oEvent) {
        // Logic to add a new regulation
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
            console.error("Readiness check or report creation failed:", oError);
          });
      },
    });
  }
);
