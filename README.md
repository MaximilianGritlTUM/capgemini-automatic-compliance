# capgemini-automatic-compliance
Capgemini Automatic Regulatory Compliance Check Tool

Epics:
| Epic | Description | User Stories |
|---|---|---|
| Epic 1: SAP Connectivity & Data Acquisition | Enable the system to connect to SAP and extract relevant data for consistent analysis. | - As a user, I want to connect to SAP so that I can analyze master and transactional data.<br>- As a compliance analyst, I want to read SAP master and transactional data so that I can assess compliance impact.<br>- As a compliance analyst, I want to read compliance-relevant fields from SAP so that I can perform regulatory evaluation.<br>- As a user, I want the system to detect and interpret non-standard SAP fields so that manual cleanup is minimized.<br>- As a user, I want SAP terms like “material” and “product” treated consistently so that analysis remains uniform and correct. |
| Epic 2: Object Selection & Scope Definition | Allow analysts to choose the SAP object type to apply the correct compliance evaluation scope. | - As a compliance analyst, I want to select which SAP object type to analyze so that the system applies the correct compliance logic. |
| Epic 3: Material Classification & Structure Analysis | Provide understanding of material type and hierarchical structure for evaluating multi-level compliance. | - As a compliance analyst, I want to identify a material’s type so that I can understand its compliance context.<br>- As a user, I want to view multi-level BOM structures so that I can analyze how components contribute to compliance.<br>- As a system user, I want compliance scoring for parent materials to consider component compliance so that results reflect the full supply chain. |
| Epic 4: Supplier & Material Relevance Assessment | Ensure only meaningful suppliers/materials are considered based on activity and transaction history. | - As a compliance analyst, I want transaction history included so that only meaningful suppliers and products are evaluated.<br>- As a user, I want to know whether a supplier or product is active so that I can focus on relevant cases.<br>- As a compliance analyst, I want to see transaction volumes and activity frequency so that I can gauge commercial significance. |
| Epic 5: Region-Based Compliance Evaluation | Incorporate geographic information so regulations can be applied based on origin and target market. | - As a compliance analyst, I want supplier country/region data included so that regulations depending on origin can be applied correctly.<br>- As a compliance analyst, I want the target market’s region considered so that destination-based regulations are evaluated properly. |
| Epic 6: Multi-Regulation Configurator | Provide a rule engine to define and evaluate criteria across multiple regulatory frameworks. | - As a system configurator, I want a rule-based engine to define compliance criteria per regulation so that the system can evaluate different frameworks.<br>- As a user, I want the system to support multiple regulations so that a single system can evaluate multiple compliance requirements. |


### POTENTIAL USER STORIES ###
* As a user, I want EHS integration, so I can expand regulatory checks.
* As a user, I want both master-data checks and optional operational flow analysis, so that I can go from quick screening to deeper evaluation.
