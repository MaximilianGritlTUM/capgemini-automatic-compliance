/**
 * TransactionHistoryFilter.js
 *
 * Utility for classifying materials based on transaction history.
 * Determines activity status (ACTIVE, INACTIVE, DORMANT) by analyzing
 * posting dates from Z_I_TA_HISTORYLINE.
 *
 * @module utils/TransactionHistoryFilter
 */
sap.ui.define([], function () {
    "use strict";

    /**
     * Activity status constants
     */
    var ActivityStatus = {
        ACTIVE: "ACTIVE",       // Transactions in the last N months
        INACTIVE: "INACTIVE",   // Has transactions, but older than N months
        DORMANT: "DORMANT"      // No transactions found
    };

    /**
     * TransactionHistoryFilter - classifies materials by transaction activity
     */
    var TransactionHistoryFilter = {

        /**
         * Activity status constants
         */
        ActivityStatus: ActivityStatus,

        /**
         * Loads material activity status by cross-referencing Z_I_Materials
         * with Z_I_TA_HISTORYLINE transaction data.
         *
         * @param {sap.ui.model.odata.v2.ODataModel} oModel - The OData model
         * @param {number} [iMonths=12] - Number of months to consider as "recent"
         * @returns {Promise<Map<string, Object>>} Map of Material -> activity info
         */
        loadMaterialActivityStatus: function (oModel, iMonths) {
            var self = this;
            iMonths = iMonths || 12;

            // Calculate cutoff date
            var dCutoffDate = new Date();
            dCutoffDate.setMonth(dCutoffDate.getMonth() - iMonths);

            return Promise.all([
                self._loadMaterials(oModel),
                self._loadTransactionHistory(oModel)
            ]).then(function (aResults) {
                var aMaterials = aResults[0];
                var aTransactions = aResults[1];

                return self._classifyAllMaterials(aMaterials, aTransactions, dCutoffDate);
            }).catch(function (oError) {
                console.warn("Failed to load material activity status:", oError);
                // Return empty map on failure - allow compliance check to continue
                return new Map();
            });
        },

        /**
         * Loads all materials from Z_I_Materials
         * @private
         */
        _loadMaterials: function (oModel) {
            return new Promise(function (resolve, reject) {
                oModel.read("/Z_I_Materials", {
                    urlParameters: {
                        "$select": "Material"
                    },
                    success: function (oData) {
                        resolve(oData.results || []);
                    },
                    error: function (oError) {
                        console.warn("Could not load Z_I_Materials:", oError);
                        resolve([]); // Return empty array on error
                    }
                });
            });
        },

        /**
         * Loads transaction history from Z_I_TA_HISTORYLINE
         * @private
         */
        _loadTransactionHistory: function (oModel) {
            return new Promise(function (resolve, reject) {
                oModel.read("/TransactionalHistory", {
                    urlParameters: {
                        "$select": "Material,PostingDate"
                    },
                    success: function (oData) {
                        resolve(oData.results || []);
                    },
                    error: function (oError) {
                        console.warn("Could not load TransactionalHistory:", oError);
                        resolve([]); // Return empty array on error
                    }
                });
            });
        },

        /**
         * Classifies all materials based on transaction history
         * @private
         * @param {Array} aMaterials - Materials from Z_I_Materials
         * @param {Array} aTransactions - Transactions from Z_I_TA_HISTORYLINE
         * @param {Date} dCutoffDate - Cutoff date for "recent" transactions
         * @returns {Map<string, Object>} Map of Material -> activity info
         */
        _classifyAllMaterials: function (aMaterials, aTransactions, dCutoffDate) {
            var self = this;
            var mActivityStatus = new Map();

            // Group transactions by material for efficient lookup
            var mTransactionsByMaterial = new Map();
            aTransactions.forEach(function (oTx) {
                var sMaterial = oTx.Material;
                if (!mTransactionsByMaterial.has(sMaterial)) {
                    mTransactionsByMaterial.set(sMaterial, []);
                }
                mTransactionsByMaterial.get(sMaterial).push(oTx);
            });

            // Classify each material
            aMaterials.forEach(function (oMaterial) {
                var sMaterial = oMaterial.Material;
                var aMaterialTx = mTransactionsByMaterial.get(sMaterial) || [];
                var oClassification = self._classifyMaterial(sMaterial, aMaterialTx, dCutoffDate);
                mActivityStatus.set(sMaterial, oClassification);
            });

            // Also add materials that only exist in transaction history but not in Z_I_Materials
            mTransactionsByMaterial.forEach(function (aTx, sMaterial) {
                if (!mActivityStatus.has(sMaterial)) {
                    var oClassification = self._classifyMaterial(sMaterial, aTx, dCutoffDate);
                    mActivityStatus.set(sMaterial, oClassification);
                }
            });

            console.log("Material activity classification complete:", mActivityStatus.size, "materials classified");
            return mActivityStatus;
        },

        /**
         * Classifies a single material based on its transaction history
         *
         * @param {string} sMaterial - Material number
         * @param {Array} aTransactions - Transactions for this material
         * @param {Date} dCutoffDate - Cutoff date for "recent" transactions
         * @returns {Object} Classification result with status, lastDate, count
         */
        _classifyMaterial: function (sMaterial, aTransactions, dCutoffDate) {
            if (!aTransactions || aTransactions.length === 0) {
                return {
                    status: ActivityStatus.DORMANT,
                    lastTransactionDate: null,
                    transactionCount: 0
                };
            }

            // Find the most recent transaction date
            var dLastDate = null;
            var bHasRecent = false;

            aTransactions.forEach(function (oTx) {
                var dPostingDate = this._parseDate(oTx.PostingDate);
                if (dPostingDate) {
                    if (!dLastDate || dPostingDate > dLastDate) {
                        dLastDate = dPostingDate;
                    }
                    if (dPostingDate >= dCutoffDate) {
                        bHasRecent = true;
                    }
                }
            }.bind(this));

            return {
                status: bHasRecent ? ActivityStatus.ACTIVE : ActivityStatus.INACTIVE,
                lastTransactionDate: dLastDate ? this._formatDate(dLastDate) : null,
                transactionCount: aTransactions.length
            };
        },

        /**
         * Parses a date from OData format
         * @private
         */
        _parseDate: function (vDate) {
            if (!vDate) {
                return null;
            }

            // Handle OData date format: /Date(timestamp)/
            if (typeof vDate === "string" && vDate.indexOf("/Date(") === 0) {
                var iTimestamp = parseInt(vDate.replace(/\/Date\((-?\d+)\)\//, "$1"), 10);
                return new Date(iTimestamp);
            }

            // Handle Date object
            if (vDate instanceof Date) {
                return vDate;
            }

            // Handle ISO string
            if (typeof vDate === "string") {
                var dParsed = new Date(vDate);
                return isNaN(dParsed.getTime()) ? null : dParsed;
            }

            return null;
        },

        /**
         * Formats a date as YYYY-MM-DD
         * @private
         */
        _formatDate: function (dDate) {
            if (!dDate) {
                return null;
            }
            var sYear = dDate.getFullYear();
            var sMonth = String(dDate.getMonth() + 1).padStart(2, "0");
            var sDay = String(dDate.getDate()).padStart(2, "0");
            return sYear + "-" + sMonth + "-" + sDay;
        },

        /**
         * Gets the activity status for a specific material from the pre-loaded map
         *
         * @param {Map<string, Object>} mActivityStatus - Pre-loaded activity status map
         * @param {string} sMaterial - Material number to look up
         * @returns {Object} Activity info or default DORMANT status
         */
        getActivityForMaterial: function (mActivityStatus, sMaterial) {
            if (!mActivityStatus || !sMaterial) {
                return {
                    status: ActivityStatus.DORMANT,
                    lastTransactionDate: null,
                    transactionCount: 0
                };
            }

            return mActivityStatus.get(sMaterial) || {
                status: ActivityStatus.DORMANT,
                lastTransactionDate: null,
                transactionCount: 0
            };
        }
    };

    return TransactionHistoryFilter;
});
