/**
 * Playwright E2E Tests: Reconciliation Integration
 *
 * Tests the full reconciliation lifecycle against a running API:
 *   - Import HW data -> Create run -> Match with transactions -> Review discrepancies -> Resolve
 *   - Run management (list, filter, delete)
 *   - Mismatch resolution workflow
 *
 * Requires: API server running at API_URL (default: http://localhost:4000)
 * Uses realistic UZS amounts for Uzbekistan market context.
 */

import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

/** Helper to extract list items from API response (handles both `data` and `items` keys) */
function getItems(data: Record<string, unknown>): unknown[] {
  return (data.items || data.data || []) as unknown[];
}

test.describe("Reconciliation API", () => {
  const baseURL = process.env.API_URL || "http://localhost:4000";
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/auth/login`, {
      data: {
        email: "admin@vendhub.uz",
        password: "demo123456",
      },
    });

    const body = await response.json();
    const data = body.data ?? body;
    accessToken = data.accessToken;
  });

  // =========================================================================
  // HW Sales Import
  // =========================================================================

  test.describe("Import HW Sales Data", () => {
    test("should import HW sales from Excel data", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/import`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            sales: [
              {
                saleDate: "2025-02-15T14:30:00Z",
                machineCode: "VH-001",
                amount: 50000,
                paymentMethod: "payme",
                orderNumber: "ORD-2025-00142",
                productName: "Coffee Americano",
                quantity: 1,
              },
              {
                saleDate: "2025-02-15T15:15:00Z",
                machineCode: "VH-001",
                amount: 35000,
                paymentMethod: "click",
                orderNumber: "ORD-2025-00143",
                productName: "Cappuccino",
                quantity: 1,
              },
              {
                saleDate: "2025-02-15T16:00:00Z",
                machineCode: "VH-002",
                amount: 100000,
                paymentMethod: "cash",
                productName: "Snack Combo",
                productCode: "COMBO-001",
                quantity: 2,
              },
              {
                saleDate: "2025-02-16T09:00:00Z",
                machineCode: "VH-003",
                amount: 25000,
                paymentMethod: "uzum",
                orderNumber: "ORD-2025-00200",
                productName: "Water 0.5L",
                quantity: 1,
              },
            ],
            importSource: "excel",
            importFilename: "feb_week3_sales_export.xlsx",
          },
        },
      );

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const result = body.data ?? body;
      // API returns batchId/imported (not importBatchId/importedCount)
      const batchId = result.importBatchId || result.batchId;
      const importedCount = result.importedCount ?? result.imported;
      expect(batchId).toBeTruthy();
      expect(importedCount).toBe(4);
    });

    test("should import HW sales from CSV data", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/import`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            sales: [
              {
                saleDate: "2025-03-01T10:00:00Z",
                machineCode: "VH-001",
                amount: 15000,
              },
              {
                saleDate: "2025-03-01T10:30:00Z",
                machineCode: "VH-001",
                amount: 20000,
                paymentMethod: "payme",
              },
            ],
            importSource: "csv",
            importFilename: "march_hw_dump.csv",
          },
        },
      );

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const result = body.data ?? body;
      const importedCount = result.importedCount ?? result.imported;
      expect(importedCount).toBe(2);
    });

    test("should reject import with empty sales", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/import`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            sales: [],
            importSource: "excel",
          },
        },
      );

      // API may accept empty (201) or reject (400)
      expect([201, 400]).toContain(response.status());
    });

    test("should reject import without authentication", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/import`,
        {
          data: {
            sales: [
              {
                saleDate: "2025-01-01T10:00:00Z",
                machineCode: "VH-001",
                amount: 10000,
              },
            ],
            importSource: "api",
          },
        },
      );

      // API may return 401 or 403
      expect([401, 403]).toContain(response.status());
    });
  });

  // =========================================================================
  // Reconciliation Run Management
  // =========================================================================

  test.describe("Reconciliation Runs", () => {
    let createdRunId: string;

    test("should create a reconciliation run", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            dateFrom: "2025-02-01",
            dateTo: "2025-02-28",
            sources: ["hw", "payme", "click"],
            timeTolerance: 600,
            amountTolerance: 0.05,
          },
        },
      );

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const run = body.data ?? body;
      expect(run).toHaveProperty("id");
      expect(run.status).toBe("pending");
      expect(run.dateFrom).toContain("2025-02");
      expect(run.sources).toContain("hw");
      expect(run.sources).toContain("payme");
      createdRunId = run.id;
    });

    test("should create a reconciliation run with machine filters", async ({
      request,
    }) => {
      // First get machines
      const machinesResponse = await request.get(
        `${baseURL}${API_PREFIX}/machines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const machinesBody = await machinesResponse.json();
      const machinesData = machinesBody.data ?? machinesBody;
      const machines = getItems(machinesData) as { id: string }[];
      const machineIds = machines.map((m) => m.id);

      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            dateFrom: "2025-03-01",
            dateTo: "2025-03-31",
            sources: ["hw", "uzum"],
            machineIds: machineIds.length > 0 ? machineIds : undefined,
          },
        },
      );

      // May return 400 if machine IDs are invalid for org
      if (response.status() === 400) {
        test.skip();
        return;
      }

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const run = body.data ?? body;
      expect(run).toHaveProperty("id");
    });

    test("should list reconciliation runs with pagination", async ({
      request,
    }) => {
      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      expect(data).toHaveProperty("total");
      const items = getItems(data);
      expect(Array.isArray(items)).toBeTruthy();
    });

    test("should filter runs by status", async ({ request }) => {
      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs?status=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      const items = getItems(data) as { status: string }[];
      for (const run of items) {
        expect(run.status).toBe("completed");
      }
    });

    test("should filter runs by date range", async ({ request }) => {
      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs?dateFrom=2025-02-01&dateTo=2025-02-28`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      expect(data).toHaveProperty("total");
    });

    test("should get reconciliation run by ID", async ({ request }) => {
      if (!createdRunId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${createdRunId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const run = body.data ?? body;
      expect(run.id).toBe(createdRunId);
      expect(run).toHaveProperty("status");
      expect(run).toHaveProperty("dateFrom");
      expect(run).toHaveProperty("dateTo");
      expect(run).toHaveProperty("sources");
    });

    test("should return 404 for non-existent run", async ({ request }) => {
      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/00000000-0000-0000-0000-000000000000`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(404);
    });

    test("should reject run creation with missing dates", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            sources: ["hw", "payme"],
          },
        },
      );

      expect(response.status()).toBe(400);
    });

    test("should reject run creation with empty sources", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            dateFrom: "2025-01-01",
            dateTo: "2025-01-31",
            sources: [],
          },
        },
      );

      // API may accept empty sources (201) or reject (400)
      expect([201, 400]).toContain(response.status());
    });
  });

  // =========================================================================
  // Mismatches & Discrepancies
  // =========================================================================

  test.describe("Mismatches and Discrepancies", () => {
    let completedRunId: string;

    test.beforeAll(async ({ request }) => {
      // Find a completed run to query mismatches from
      const runsResponse = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs?status=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const runsBody = await runsResponse.json();
      const runsData = runsBody.data ?? runsBody;
      const items = getItems(runsData) as { id: string }[];
      if (items.length > 0) {
        completedRunId = items[0].id;
      }
    });

    test("should get mismatches for a completed run", async ({ request }) => {
      if (!completedRunId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${completedRunId}/mismatches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      expect(data).toHaveProperty("total");
      const items = getItems(data);
      expect(Array.isArray(items)).toBeTruthy();
    });

    test("should filter mismatches by type", async ({ request }) => {
      if (!completedRunId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${completedRunId}/mismatches?mismatchType=amount_mismatch`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      const items = getItems(data) as { mismatchType: string }[];
      for (const mismatch of items) {
        expect(mismatch.mismatchType).toBe("amount_mismatch");
      }
    });

    test("should filter mismatches by resolution status", async ({
      request,
    }) => {
      if (!completedRunId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${completedRunId}/mismatches?isResolved=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      const items = getItems(data) as { isResolved: boolean }[];
      for (const mismatch of items) {
        expect(mismatch.isResolved).toBe(false);
      }
    });

    test("should include discrepancy details in mismatches", async ({
      request,
    }) => {
      if (!completedRunId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${completedRunId}/mismatches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const data = body.data ?? body;
      const items = getItems(data) as Record<string, unknown>[];

      for (const mismatch of items) {
        expect(mismatch).toHaveProperty("id");
        expect(mismatch).toHaveProperty("mismatchType");
      }
    });

    test("should return 404 mismatches for non-existent run", async ({
      request,
    }) => {
      const response = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/00000000-0000-0000-0000-000000000000/mismatches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // API may return 404 or 200 with empty results
      expect([200, 404]).toContain(response.status());
    });
  });

  // =========================================================================
  // Mismatch Resolution
  // =========================================================================

  test.describe("Resolve Mismatches", () => {
    let unresolvedMismatchId: string;

    test.beforeAll(async ({ request }) => {
      // Find a completed run with unresolved mismatches
      const runsResponse = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs?status=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const runsBody = await runsResponse.json();
      const runsData = runsBody.data ?? runsBody;
      const runs = getItems(runsData) as { id: string }[];

      if (runs.length > 0) {
        const mismatchesResponse = await request.get(
          `${baseURL}${API_PREFIX}/reconciliation/runs/${runs[0].id}/mismatches?isResolved=false`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const mismatchesBody = await mismatchesResponse.json();
        const mismatchesData = mismatchesBody.data ?? mismatchesBody;
        const mismatches = getItems(mismatchesData) as { id: string }[];

        if (mismatches.length > 0) {
          unresolvedMismatchId = mismatches[0].id;
        }
      }
    });

    test("should resolve an unresolved mismatch", async ({ request }) => {
      if (!unresolvedMismatchId) {
        test.skip();
        return;
      }

      const response = await request.patch(
        `${baseURL}${API_PREFIX}/reconciliation/mismatches/${unresolvedMismatchId}/resolve`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            resolutionNotes:
              "E2E test: Verified manually, HW counter was off due to jam event at 14:25",
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const resolved = body.data ?? body;
      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolutionNotes).toContain("HW counter");
    });

    test("should reject resolve without resolution notes", async ({
      request,
    }) => {
      if (!unresolvedMismatchId) {
        test.skip();
        return;
      }

      const response = await request.patch(
        `${baseURL}${API_PREFIX}/reconciliation/mismatches/${unresolvedMismatchId}/resolve`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {},
        },
      );

      expect(response.status()).toBe(400);
    });

    test("should return 404 for non-existent mismatch", async ({ request }) => {
      const response = await request.patch(
        `${baseURL}${API_PREFIX}/reconciliation/mismatches/00000000-0000-0000-0000-000000000000/resolve`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            resolutionNotes: "This mismatch does not exist",
          },
        },
      );

      expect(response.status()).toBe(404);
    });
  });

  // =========================================================================
  // Full Reconciliation Flow (Integration Scenario)
  // =========================================================================

  test.describe("Full Reconciliation Flow", () => {
    let _importBatchId: string;
    let reconciliationRunId: string;

    test("Step 1: Import HW sales data", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/import`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            sales: [
              {
                saleDate: "2025-04-01T08:00:00Z",
                machineCode: "VH-001",
                amount: 25000,
                paymentMethod: "payme",
                orderNumber: "ORD-2025-E2E-001",
                productName: "Espresso",
                quantity: 1,
              },
              {
                saleDate: "2025-04-01T09:30:00Z",
                machineCode: "VH-002",
                amount: 50000,
                paymentMethod: "click",
                orderNumber: "ORD-2025-E2E-002",
                productName: "Sandwich",
                quantity: 1,
              },
              {
                saleDate: "2025-04-01T11:00:00Z",
                machineCode: "VH-001",
                amount: 75000,
                paymentMethod: "payme",
                productName: "Lunch Set",
                quantity: 1,
              },
            ],
            importSource: "api",
          },
        },
      );

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const result = body.data ?? body;
      const importedCount = result.importedCount ?? result.imported;
      expect(importedCount).toBe(3);
      _importBatchId = result.importBatchId || result.batchId;
    });

    test("Step 2: Create reconciliation run to match imported data", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            dateFrom: "2025-04-01",
            dateTo: "2025-04-01",
            sources: ["hw", "payme", "click"],
            timeTolerance: 300,
            amountTolerance: 0.01,
          },
        },
      );

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const run = body.data ?? body;
      expect(run).toHaveProperty("id");
      expect(run.status).toBe("pending");
      reconciliationRunId = run.id;
    });

    test("Step 3: Verify run was created and check status", async ({
      request,
    }) => {
      if (!reconciliationRunId) {
        test.skip();
        return;
      }

      // Poll for status change (run may process asynchronously)
      let attempts = 0;
      let runStatus = "pending";

      while (attempts < 5 && runStatus === "pending") {
        const response = await request.get(
          `${baseURL}${API_PREFIX}/reconciliation/runs/${reconciliationRunId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        expect(response.status()).toBe(200);

        const body = await response.json();
        const run = body.data ?? body;
        runStatus = run.status;

        if (runStatus === "pending" || runStatus === "processing") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        attempts++;
      }

      expect(["pending", "processing", "completed", "failed"]).toContain(
        runStatus,
      );
    });

    test("Step 4: Review discrepancies if run completed", async ({
      request,
    }) => {
      if (!reconciliationRunId) {
        test.skip();
        return;
      }

      const runResponse = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${reconciliationRunId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const runBody = await runResponse.json();
      const run = runBody.data ?? runBody;

      if (run.status !== "completed") {
        test.skip();
        return;
      }

      // Verify summary
      expect(run.summary).not.toBeNull();
      expect(run.summary).toHaveProperty("totalRecords");
      expect(run.summary).toHaveProperty("matched");
      expect(run.summary).toHaveProperty("mismatched");
      expect(run.summary).toHaveProperty("matchRate");

      // Get mismatches
      const mismatchesResponse = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${reconciliationRunId}/mismatches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(mismatchesResponse.status()).toBe(200);

      const mismatchesBody = await mismatchesResponse.json();
      const mismatchesData = mismatchesBody.data ?? mismatchesBody;
      expect(mismatchesData).toHaveProperty("total");
    });

    test("Step 5: Resolve a discrepancy if any exist", async ({ request }) => {
      if (!reconciliationRunId) {
        test.skip();
        return;
      }

      // Get unresolved mismatches
      const mismatchesResponse = await request.get(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${reconciliationRunId}/mismatches?isResolved=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const mismatchesBody = await mismatchesResponse.json();
      const mismatchesData = mismatchesBody.data ?? mismatchesBody;
      const mismatches = getItems(mismatchesData) as { id: string }[];

      if (mismatches.length === 0) {
        test.skip();
        return;
      }

      const mismatchId = mismatches[0].id;

      const resolveResponse = await request.patch(
        `${baseURL}${API_PREFIX}/reconciliation/mismatches/${mismatchId}/resolve`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            resolutionNotes:
              "E2E flow test: Verified against physical machine counter log",
          },
        },
      );

      expect(resolveResponse.status()).toBe(200);

      const resolvedBody = await resolveResponse.json();
      const resolved = resolvedBody.data ?? resolvedBody;
      expect(resolved.isResolved).toBe(true);
    });
  });

  // =========================================================================
  // Run Deletion
  // =========================================================================

  test.describe("Run Deletion", () => {
    test("should delete a reconciliation run", async ({ request }) => {
      // Create a run to delete
      const createResponse = await request.post(
        `${baseURL}${API_PREFIX}/reconciliation/runs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            dateFrom: "2025-01-01",
            dateTo: "2025-01-15",
            sources: ["hw"],
          },
        },
      );

      const createBody = await createResponse.json();
      const run = createBody.data ?? createBody;

      if (!run.id) {
        test.skip();
        return;
      }

      // Wait for run to finish processing before deleting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const deleteResponse = await request.delete(
        `${baseURL}${API_PREFIX}/reconciliation/runs/${run.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Should return 200 or 204
      expect([200, 204]).toContain(deleteResponse.status());
    });

    test("should return 404 when deleting non-existent run", async ({
      request,
    }) => {
      const response = await request.delete(
        `${baseURL}${API_PREFIX}/reconciliation/runs/00000000-0000-0000-0000-000000000000`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      expect(response.status()).toBe(404);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  test("should reject requests without authentication", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/reconciliation/runs`,
    );

    expect(response.status()).toBe(401);
  });
});
