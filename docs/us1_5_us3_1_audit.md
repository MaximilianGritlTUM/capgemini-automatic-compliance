# US1.5 + US3.1 Implementation Audit (PASS/FAIL)

## A) Story-related artifacts (discovery)

### Backend CDS / service exposure / annotations
- `capgeminiappws2025/webapp/manifest.json:31-45` defines OData mainService (`/sap/opu/odata/sap/Z_CONFIG_SRV_UI`) and annotation source `Z_CONFIG_SRV_UI_VAN` (localUri points to `webapp/localService/mainService/Z_CONFIG_SRV_UI_VAN.xml`).
- `capgeminiappws2025/webapp/localService` is missing in this repo, so no `$metadata` or annotation XML is available here.
- No CDS artifacts found in this repo (no `*.cds`, `srv/`, `db/`), so backend semantic-layer definitions (e.g., `Z_I_*`) are not verifiable from this codebase.

### UI (manifest, views, controllers, utils)
- `capgeminiappws2025/webapp/view/Main.view.xml:10-46` uses “Material” and “Material Type” labels with fallback bindings for Product fields.
- `capgeminiappws2025/webapp/controller/Main.controller.js:7-26` normalizes `MaterialType` from `ProductType`.
- `capgeminiappws2025/webapp/view/Dashboard.view.xml:80-95` shows “Material” / “Material Type” columns with fallback bindings.
- `capgeminiappws2025/webapp/controller/Dashboard.controller.js:9-17` normalizes `MaterialType` from `ProductType` for report results.
- `capgeminiappws2025/webapp/view/TransactionDashboard.view.xml:13-72` uses “Material” wording in UI.
- `capgeminiappws2025/webapp/view/ComplianceReportDetail.view.xml:144-153` uses “Material” in BOM table labeling.
- `capgeminiappws2025/webapp/controller/ComplianceReportDetail.controller.js:107-112` normalizes Product/Material terminology in export.
- `capgeminiappws2025/webapp/utils/nonstandard/FieldProcessor.js:269-275` registers `MaterialType` field definition.
- `capgeminiappws2025/webapp/utils/nonstandard/WhitelistLoader.js:52-58` provides static material type whitelist (T134 codes).
- `capgeminiappws2025/webapp/utils/nonstandard/FieldTypes.js:200-238` contains T134 material type codes.
- `capgeminiappws2025/webapp/utils/CheckAlgorithm.js:137-139` references `Z_I_Materials` for BOM rule filtering.

### Tests / scripts
- `capgeminiappws2025/package.json` scripts: `start`, `start-local`, `start-mock`, `unit-test`, `int-test`, `build`, `deploy`.

## B) US1.5 – Harmonize "Material" vs "Product" Terminology

| Checklist Item | PASS/FAIL | Evidence (file/field) | Notes / Fix |
| --- | --- | --- | --- |
| (1) Canonical term used in UI or consistent mapping implemented | **PASS** | UI labels use “Material” and bind to product fields via fallback: `capgeminiappws2025/webapp/view/Main.view.xml:13-46`, `capgeminiappws2025/webapp/view/Dashboard.view.xml:81-95`, `capgeminiappws2025/webapp/view/TransactionDashboard.view.xml:13-72`. | Canonical term is “Material”; bindings allow Product fields when needed. |
| (2) No contradictory terminology in the same user journey | **PASS** | No “Product” labels found in main dashboards; “Material” is used in key UI surfaces (Main/Dashboard/Transaction/BOM). | Product appears only in fallback bindings or normalization logic, not in labels. |
| (3) OData/service/entity naming and UI bindings are consistent | **FAIL** | OData service is referenced but no metadata exists locally to confirm entity set naming: `capgeminiappws2025/webapp/manifest.json:31-45`; `capgeminiappws2025/webapp/localService` missing. | Add/attach service metadata (local or documented) to verify whether entities are `Materials` vs `Products` and ensure UI bindings match. |
| (4) Reporting/export logic normalizes product vs material terminology | **PASS** | Export normalizes product/material to “Material”: `capgeminiappws2025/webapp/controller/ComplianceReportDetail.controller.js:107-112`. | Ensures reporting outputs use a consistent term. |

## C) US3.1 – Identify Material Type

| Checklist Item | PASS/FAIL | Evidence (file/field) | Notes / Fix |
| --- | --- | --- | --- |
| (1) Material type derived/read from SAP master data (e.g., MARA/MTART) | **FAIL** | Only static whitelist for material type is present: `capgeminiappws2025/webapp/utils/nonstandard/WhitelistLoader.js:52-58`, `FieldTypes.js:200-238`. No OData read for MTART found. | Implement backend read/exposure of MTART (e.g., via CDS/OData) and consume it. |
| (2) Material type present in core material CDS view/entity (e.g., Z_I_Materials) | **FAIL** | Only a string reference to `Z_I_Materials` in algorithm filter: `capgeminiappws2025/webapp/utils/CheckAlgorithm.js:137-139`. No CDS definitions in repo. | Add/verify CDS view with `MaterialType` (and text) in backend. |
| (3) Material type exposed via OData metadata | **FAIL** | No `$metadata` in repo; `localService` missing. | Provide local metadata or confirm via live service `$metadata` that `MaterialType` exists. |
| (4) UI displays material type or uses it in logic | **PASS** | “Material Type” column and fallback binding: `capgeminiappws2025/webapp/view/Main.view.xml:16-46`; dashboard column: `capgeminiappws2025/webapp/view/Dashboard.view.xml:82-95`; normalization logic: `capgeminiappws2025/webapp/controller/Main.controller.js:7-16`, `capgeminiappws2025/webapp/controller/Dashboard.controller.js:9-17`. | UI can render `MaterialType`/`MaterialTypeText`, with fallback to product type fields. |
| (5) No broken bindings after dev merge (bindings exist in metadata) | **FAIL** | No metadata available locally to validate `MaterialType*` properties. | Add metadata or validate against live service. |

## Gaps to finish DONE
1) Provide service metadata in this repo so bindings can be verified: add `capgeminiappws2025/webapp/localService/mainService/metadata.xml` (and annotation XMLs) or otherwise attach `$metadata` used by `mainService`.
2) Ensure backend CDS view for materials includes `MaterialType` (MTART) and is exposed by `Z_CONFIG_SRV_UI` (e.g., `Z_I_Materials` with `MaterialType`/`MaterialTypeText`). This is required for US3.1 items (1)-(3) and for US1.5 item (3).
3) Align UI bindings to the actual entity/model once metadata is present (e.g., ensure `MaterialType` and `MaterialTypeText` exist in the entity used by `Main.view.xml` and `Dashboard.view.xml`; if backend uses different field names, update bindings accordingly).

## How to verify
- Commands:
  - `npm run start` (connect to live backend)
  - `npm run start-mock` (if local mock metadata is available)
  - `npm run unit-test` / `npm run int-test` (if tests are set up)
- UI steps:
  - Open the main dashboard and check the “Material Type” column shows values (or fallback) in `Main.view.xml` table.
  - Open the dashboard “Recent Compliance Issues” table and confirm “Material Type” renders (if that data is supplied).
  - Open Compliance Report Detail and verify “Material” labels and export normalization (Product -> Material) is applied.
- OData validation:
  - Inspect `/sap/opu/odata/sap/Z_CONFIG_SRV_UI/$metadata` and confirm a materials entity includes `MaterialType`/`MaterialTypeText` and that UI bindings map to those properties.
