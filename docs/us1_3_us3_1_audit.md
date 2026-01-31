# US1.3 + US3.1 Implementation Audit (PASS/FAIL)

> Scope: frontend repo `capgeminiappws2025`. Backend CDS/OData definitions are **not** present here, so backend-only checks are marked FAIL unless verifiable from this repo.

## US1.3 – Access Compliance-Relevant SAP Fields

| Checklist Item | PASS/FAIL | Evidence (file/field) | Notes / Fix |
| --- | --- | --- | --- |
| (1) Compliance-relevant fields exist in backend semantic layer (CDS) and are readable | **FAIL** | No CDS/service artifacts found in repo (no `*.cds`, `srv/`, `db/` folders). | Backend CDS (e.g., `Z_I_*` views) not available in this repo; cannot verify field existence/readability. |
| (2) Fields are exposed via OData ($metadata shows them) | **FAIL** | `capgeminiappws2025/webapp/manifest.json:31-44` declares `mainService` (`/sap/opu/odata/sap/Z_CONFIG_SRV_UI`) but no local metadata file exists (referenced `localService/mainService/Z_CONFIG_SRV_UI_VAN.xml` is missing). | Provide OData `$metadata` or local metadata XML to verify fields are exposed. |
| (3) Mapping/config mechanism links regulations to (view_name, element_name) | **PASS** | `capgeminiappws2025/webapp/controller/configurator/ConfiguratorRules.controller.js:130-137` creates `/Z_I_ZREG_FIELDS` with `Regid`, `Viewname`, `Elementname`. `capgeminiappws2025/webapp/view/configurator/ConfiguratorRules.view.xml:50-55` displays `Viewname`/`Elementname`. | Mapping mechanism exists via `/Z_I_ZREG_FIELDS` and value help `/Z_I_ZREG_FIELDS_VH`. |
| (4) Availability + data quality checks are performed | **PASS** | `capgeminiappws2025/webapp/utils/CheckAlgorithm.js:258-360` computes `avail_cat`, `data_quality`, `gap_desc`, `recommendation` based on missing values + whitelist validation. | Logic is implemented in frontend; backend-side validation not verifiable here. |
| (5) Output of checks persisted/exposed as report results | **PASS** | `capgeminiappws2025/webapp/utils/CheckAlgorithm.js:436-449` creates `/Report` with `to_Results`/`to_BOMResults`. UI consumes `/Report` in `capgeminiappws2025/webapp/view/ComplianceReport.view.xml:30-36` and binds to `to_Results` in `capgeminiappws2025/webapp/view/ComplianceReportDetail.view.xml:70-115`. | Assumes backend supports create on `/Report` and expands `to_Results`/`to_BOMResults`. |
| (6) UI can use it (config mapping + gaps/quality visible) | **PASS** | Readiness run uses mapped fields: `capgeminiappws2025/webapp/controller/configurator/ConfiguratorMain.controller.js:265-301` reads `.../to_Fields` and calls `do_checking_algorithm`. Report detail shows gaps/quality in `capgeminiappws2025/webapp/view/ComplianceReportDetail.view.xml:100-112`. | End-to-end flow present in UI and utility logic. |

## US3.1 – Identify Material Type

| Checklist Item | PASS/FAIL | Evidence (file/field) | Notes / Fix |
| --- | --- | --- | --- |
| (1) Material type derived/read from SAP master data (e.g., MARA/MTART) | **FAIL** | No SAP master-data OData read for `MaterialType`/`MTART` found. Only whitelist validation via T134: `capgeminiappws2025/webapp/utils/nonstandard/WhitelistLoader.js:52-58`. | Implement OData read from SAP material master (e.g., `Z_I_Materials` with `MaterialType`) or confirm backend provides it. |
| (2) Material type present in core material CDS view/entity (Z_I_Materials) | **FAIL** | Only reference to `Z_I_Materials` is in algorithm filter: `capgeminiappws2025/webapp/utils/CheckAlgorithm.js:137-139`. No CDS definition present. | Add/verify CDS view with `MaterialType` field. |
| (3) Material type exposed via OData | **FAIL** | No metadata in repo; cannot confirm `MaterialType` in `$metadata`. | Provide `localService` metadata or confirm via live service metadata. |
| (4) UI displays material type in a relevant view | **PASS** | `capgeminiappws2025/webapp/view/Main.view.xml:15-47` adds “Material Type” column with fallback binding. `capgeminiappws2025/webapp/controller/Main.controller.js:7-26` normalizes `MaterialType` from `ProductType`. | UI displays material type using fallback strategy. |
| (5) No broken bindings after dev merge (field exists in metadata) | **FAIL** | Metadata not available in repo; cannot verify `MaterialType`/`MaterialTypeText` exist in OData. | Add metadata file or validate via service `$metadata`. |

## Gaps to finish DONE

1) **Backend CDS + OData metadata missing in repo**: add or reference CDS views (e.g., `Z_I_Materials`, `Z_I_ZREG_FIELDS`, `Z_I_Report*`) and include `$metadata`/local metadata files so UI bindings can be verified.
2) **US3.1 data source**: ensure `MaterialType` (e.g., MARA-MTART) is exposed in `Z_I_Materials` (or equivalent), and available via `/sap/opu/odata/sap/Z_CONFIG_SRV_UI/$metadata`.
3) **Binding verification**: confirm UI bindings (`MaterialType`, `MaterialTypeText`, `avail_cat`, `data_quality`, `gap_desc`, etc.) exist in OData metadata; add/update localService metadata if needed.

## How to verify

Commands (from `capgeminiappws2025`):
- `npm run start` (runs standard UI5 FLP preview)
- `npm run start-mock` (uses `ui5-mock.yaml` if backend is unavailable)

UI steps:
1) Open Configurator → select a regulation → add rules (View/Field) and start readiness check. Confirm report creation.
2) Open Compliance Report list → open a report → verify `avail_cat`, `data_quality`, `gap_desc`, `recommendation` show in “Fields” tab.
3) Open Main view → verify “Material Type” column shows values or fallback (`MaterialTypeText/MaterialType/ProductTypeText/ProductType`).
4) Validate OData metadata at `/sap/opu/odata/sap/Z_CONFIG_SRV_UI/$metadata` includes `MaterialType` and report/result fields.
