# CSP Batch Bulk Download Feature

Use this as the implementation brief for adding internal-style batch bulk downloads to a CSP/reseller dashboard in another repo.

## Goal

Add a CSP/reseller bulk download workflow that lets a reseller upload a CSV/XLSX file and download PDFs/assets for only the rows in that uploaded batch.

This must behave similarly to the internal bulk download flow, but CSP uploads must be snapshot-only. They must not import or update the normal external subscription/customer table.

Note for repos without Enterprise SKUs: implement the SMB-only version. Ignore all `e1`, `e3`, `e5`, `me3`, `me5`, `me7`, and `other_enterprise` examples and tests. The core feature is the same; only the SKU matrix and flyer list are smaller.

## Non-Negotiable Requirements

- CSP dashboard needs a `Bulk Download` tab or equivalent entry point.
- CSP batch upload accepts CSV/XLSX using the same upload template columns as the internal bulk download.
- Uploaded rows are stored in a dedicated snapshot table keyed by upload batch.
- Upload must not insert, update, delete, enrich, or dedupe rows in `external_subscription` or the normal CSP customer/subscription table.
- Batch download must include only rows uploaded in that exact batch.
- Every batch and every uploaded row must be scoped by reseller org.
- Public PDF/asset URLs must be token-gated and must carry `orgId` + `uploadBatchId`.
- Asset/flyer generation must use the right journey:
  - Known starting SKU, such as `bb`, `bs`, `bp`: `renewal`
  - If the repo supports Enterprise SKUs, known Enterprise starts such as `e1`, `e3`, `e5`, `me3`, `me5` are also `renewal`
  - Unknown/other starting SKU, such as `other`: `new_customer`
  - If the repo supports Enterprise fallback, `other_enterprise` is also `new_customer`

## Upload Columns

Support these headers, with the same aliases used by the internal upload mapper if possible:

| Column | Required | Notes |
| --- | --- | --- |
| `Partner Name` | Yes | Reseller/partner name shown in reseller-list PDF |
| `Customer Name` | Yes | Customer/account name |
| `Current SKU` | Yes | Starting SKU display name, for example `Business Premium`. If the repo supports Enterprise SKUs, also accept values like `Microsoft 365 E3`. |
| `Seat Count` | Yes | Integer >= 1 |
| `Region` | No | Default to `United States` if missing |
| `Current SKU Customer Cost` | Yes | Current per-user monthly customer price |
| `Current SKU Reseller Cost` | Yes | Current per-user monthly reseller cost |
| `Target SKU` | Yes | Target SKU display name or canonical ending SKU accepted by existing rules |
| `Target SKU Customer Cost` | Yes | Target per-user monthly customer price |
| `Target SKU Reseller Cost` | Yes | Target per-user monthly reseller cost |

Validation should canonicalize:

- `currentSku`: store the starting SKU display name if downstream code expects names.
- `targetSku`: store the ending SKU id if downstream code expects ids.
- Validate the target SKU is allowed from the starting SKU using the existing upgrade matrix.

## Data Model

Create a new snapshot table. Example name:

`reseller_upload_batch_rows`

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text/uuid | Row id |
| `upload_job_id` | text/uuid | Batch id, FK to existing `upload_jobs` if available |
| `org_id` | text/uuid | Reseller org id |
| `row_index` | integer | Source spreadsheet row number |
| `partner_name` | text | Uploaded partner/reseller name |
| `customer_name` | text | Uploaded customer name |
| `current_sku` | text | Canonical starting SKU display name |
| `seat_count` | integer | Seat count |
| `cost_per_user` | numeric | Keep for compatibility; usually current customer cost |
| `region` | text | Default `United States` |
| `target_sku` | text | Canonical ending SKU id |
| `current_sku_customer_cost` | numeric | Uploaded current customer price |
| `current_sku_reseller_cost` | numeric | Uploaded current reseller price |
| `target_sku_customer_cost` | numeric | Uploaded target customer price |
| `target_sku_reseller_cost` | numeric | Uploaded target reseller price |
| `upload_meta` | json/jsonb | `{ filename, rowCount, uploadedAt, sourceType }` |
| `created_by` | text/uuid | Reseller user id |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Indexes:

- `(upload_job_id)`
- `(org_id, upload_job_id)`
- `(created_by)`
- `(org_id, created_at)`

Enable RLS if the repo uses RLS.

## Backend Routes

Use reseller-authenticated routes for upload/history/link creation:

- `POST /api/reseller/batch-uploads`
  - Multipart field: `file`
  - Streams NDJSON progress if the internal upload flow does this already.
  - Parses and validates CSV/XLSX.
  - Creates a completed upload batch.
  - Inserts only into snapshot rows.
  - Does not touch `external_subscription`.

- `GET /api/reseller/batch-uploads`
  - Returns upload history for current reseller org only.
  - Shape can match internal upload history:
    - `batchId`
    - `filename`
    - `rowCount`
    - `uploadedAt`
    - `sourceType`

- `POST /api/reseller/pdf/upload-list/link`
  - Body: `{ "uploadBatchId": "..." }`
  - Authenticated reseller route.
  - Verify the batch belongs to `currentUser.orgId`.
  - Return a public token-gated URL for the reseller-list PDF.

Use public token-gated routes for the actual PDFs/assets:

- `GET /api/pdf/reseller-upload-list/reseller-list?dlToken=...`
- `GET /api/pdf/reseller-upload-list/customer-list?dlToken=...`
- `GET /api/pdf/reseller-upload-list/opportunity?dlToken=...`
- `GET /api/pdf/reseller-upload-list/assets?dlToken=...`

Token payload must include:

- `scope`
- `orgId`
- `uploadBatchId`
- `uploadPartnerName` for customer-list links
- `uploadCustomerId` for opportunity/assets links

Every query must filter by both `uploadBatchId` and `orgId`. For single-row routes, filter by `uploadBatchId`, `orgId`, and row id.

## PDF Behavior

Reseller-list PDF:

- Load snapshot rows for `uploadBatchId + orgId`.
- Group by `partnerName`.
- Show customer count, seat count, and expiring ARR.
- Generate customer-list links scoped to `uploadBatchId + orgId + partnerName`.

Customer-list PDF:

- Load snapshot rows for `uploadBatchId + orgId`.
- Filter by `uploadPartnerName`.
- Show each uploaded customer row.
- Generate opportunity links scoped to `uploadBatchId + orgId + uploadCustomerId`.

Opportunity PDF:

- Load one snapshot row by `uploadBatchId + orgId + uploadCustomerId`.
- Render opportunity details from uploaded row values.
- Generate an assets ZIP link scoped to the same row.

Assets ZIP:

- Load one snapshot row by `uploadBatchId + orgId + uploadCustomerId`.
- Resolve starting SKU id from `currentSku`.
- Resolve ending SKU id from `targetSku`.
- Generate solution ZIP using the uploaded prices, seats, region, and correct journey.

Journey resolution must be:

```ts
function resolveUploadRowJourney(
  startingSkuId: string,
): 'new_customer' | 'renewal' {
  return startingSkuId === 'other' || startingSkuId === 'other_enterprise'
    ? 'new_customer'
    : 'renewal';
}
```

SMB-only repos can simplify this to:

```ts
function resolveUploadRowJourney(
  startingSkuId: string,
): 'new_customer' | 'renewal' {
  return startingSkuId === 'other' ? 'new_customer' : 'renewal';
}
```

Then call the asset generator like:

```ts
await proposalAssetService.generateSolutionZip({
  journey: resolveUploadRowJourney(startingSkuId),
  customerId: row.id,
  customerName: row.customerName,
  opportunityId: row.id,
  startingSkuId,
  startingSkuName: startingSku?.name ?? row.currentSku,
  endingSkuId,
  seats: row.seatCount,
  expiringArr: row.currentSkuCustomerCost * row.seatCount * 12,
  region: row.region,
  currentCustomerMonthlyPerUser: row.currentSkuCustomerCost,
  targetCustomerMonthlyPerUser: row.targetSkuCustomerCost,
});
```

## Flyer Mapping Notes

Do not assume all upload rows are `new_customer`.

If the customer has a known starting SKU, it is an existing customer/renewal-style upgrade for flyer resolution.

Important examples:

| Starting SKU | Target SKU | Journey | Flyer |
| --- | --- | --- | --- |
| `Business Premium` / `bp` | `attach_defender` | `renewal` | `single_renewal_security/bp_to_defender_suite.pptx` |
| `Business Premium` / `bp` | `attach_purview` | `renewal` | `single_renewal_security/bp_to_purview_suite.pptx` |
| `Business Premium` / `bp` | `attach_defender_purview` | `renewal` | `single_renewal_security/bp_to_defender_and_purview_suite.pptx` |
| `Other` / `other` | SMB targets | `new_customer` | `new_customer_other_to_*/*.pptx` |

Enterprise-only examples, if the target repo supports Enterprise SKUs:

| Starting SKU | Target SKU | Journey | Flyer |
| --- | --- | --- | --- |
| `Microsoft 365 E3` / `me3` | `me5_cb` | `renewal` | `single_renewal_enterprise_ai/me3_to_me5_cb.pptx` |
| `Other (Enterprise)` / `other_enterprise` | Enterprise targets | `new_customer` | `new_customer_enterprise_*/*.pptx` |

The common Enterprise bug to avoid, only relevant if Enterprise SKUs exist:

```txt
No flyer template mapping found for new_customer:me3:me5_cb
```

The correct key is:

```txt
renewal:me3:me5_cb
```

## Frontend

Add a CSP dashboard tab, for example `Bulk Download`.

UI components:

- Upload button opens the same bulk upload dialog used internally, or a shared variant.
- Upload dialog should support a mode flag:
  - `internal`
  - `reseller-snapshot`
- In `reseller-snapshot` mode, call `/api/reseller/batch-uploads`.
- Show upload progress and validation failures.
- Upload history table lists only CSP snapshot batches for current org.
- Download button calls `/api/reseller/pdf/upload-list/link`, then opens the returned URL.

Suggested hook names:

- `useResellerBatchUploadHistory()`
- `useCreateResellerBatchUpload()`
- `createResellerUploadBatchPdfLink(batchId)`

## Security

- `POST /api/reseller/batch-uploads`, `GET /api/reseller/batch-uploads`, and `POST /api/reseller/pdf/upload-list/link` must require reseller authentication.
- Link creation must verify the batch belongs to the current reseller org before creating the token.
- Public PDF/asset routes must verify token scope.
- Public PDF/asset routes must read rows only by `orgId + uploadBatchId`.
- Public single-row routes must read rows only by `orgId + uploadBatchId + rowId`.
- If the token service requires a default tenant for public download verification, create these download tokens with that default tenant and carry reseller org separately in `orgId`.

## Audit/Telemetry

Record audit events for:

- Snapshot upload success/failure.
- Batch history list success/failure.
- PDF link creation success/failure.

Metadata should include:

- `storage: 'snapshot'`
- `uploadBatchId`
- `filename`
- `insertedCount`
- `flaggedCount`
- `sourceType`

## Tests To Add

Backend:

- Upload creates snapshot rows and an upload batch.
- Upload does not call or write `external_subscription`.
- List batches returns only current org batches.
- Link creation rejects batch ids from another org.
- Reseller-list PDF uses only rows in the requested batch.
- Customer-list PDF filters by uploaded partner name within the same batch.
- Opportunity/assets routes require row id to belong to the same batch and org.
- Asset generation uses `renewal` for known starting SKUs.
- Asset generation uses `new_customer` for `other`.
- Regression: `Business Premium -> attach_defender` must map to `single_renewal_security/bp_to_defender_suite.pptx`.
- If Enterprise SKUs are supported, asset generation uses `new_customer` for `other_enterprise`.
- If Enterprise SKUs are supported, regression: `Microsoft 365 E3 -> me5_cb` must call asset generation with `journey: 'renewal'`, `startingSkuId: 'me3'`, `endingSkuId: 'me5_cb'`.

Frontend:

- Upload dialog in reseller mode calls the reseller snapshot endpoint.
- Upload history refreshes after successful upload.
- Download button calls the reseller batch PDF link endpoint with the selected `batchId`.
- Existing internal upload behavior remains unchanged.

## Acceptance Criteria

- CSP users can upload CSV/XLSX and see the upload in `Bulk Download` history.
- Downloading a batch includes only rows from that batch.
- The upload does not modify CSP customer/subscription records or `external_subscription`.
- Token URLs cannot be used to read another org's batch.
- Asset ZIP generation works for SMB attach targets like `bp -> attach_defender` and `bp -> attach_purview`.
- If Enterprise SKUs are supported, asset ZIP generation works for known Enterprise upgrades like `me3 -> me5_cb`.
- Internal bulk download behavior remains intact.
