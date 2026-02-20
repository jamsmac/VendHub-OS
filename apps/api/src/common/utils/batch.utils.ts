/**
 * Batch Operations Utilities
 * Common utilities for processing large datasets in batches
 */

export interface BatchOptions {
  batchSize?: number;
  delayMs?: number;
  concurrency?: number;
  onProgress?: (progress: BatchProgress) => void;
  onError?: (error: Error, item: any, index: number) => 'skip' | 'abort';
}

export interface BatchProgress {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: any; error: Error; index: number }>;
  totalProcessed: number;
  durationMs: number;
}

/**
 * Split array into chunks of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process items in batches with progress tracking
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {},
): Promise<BatchResult<R>> {
  const {
    batchSize = 100,
    delayMs = 0,
    concurrency = 10,
    onProgress,
    onError = () => 'skip',
  } = options;

  const startTime = Date.now();
  const successful: R[] = [];
  const failed: Array<{ item: any; error: Error; index: number }> = [];
  let processedCount = 0;

  const batches = chunk(items, batchSize);
  const totalBatches = batches.length;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Process batch with concurrency limit
    const batchResults = await processWithConcurrency(
      batch.map((item, localIndex) => ({
        item,
        globalIndex: batchIndex * batchSize + localIndex,
      })),
      async ({ item, globalIndex }) => {
        try {
          const result = await processor(item, globalIndex);
          return { success: true, result, index: globalIndex };
        } catch (error: unknown) {
          return { success: false, error: error instanceof Error ? error : new Error(String(error)), item, index: globalIndex };
        }
      },
      concurrency,
    );

    // Process results
    for (const result of batchResults) {
      processedCount++;

      if (result.success && result.result !== undefined) {
        successful.push(result.result as R);
      } else if (!result.success && result.error) {
        const action = onError(result.error, result.item, result.index);
        if (action === 'abort') {
          return {
            successful,
            failed,
            totalProcessed: processedCount,
            durationMs: Date.now() - startTime,
          };
        }
        failed.push({ item: result.item, error: result.error as Error, index: result.index });
      }
    }

    // Report progress
    if (onProgress) {
      const elapsedMs = Date.now() - startTime;
      const avgTimePerItem = elapsedMs / processedCount;
      const remainingItems = items.length - processedCount;

      onProgress({
        processed: processedCount,
        total: items.length,
        successful: successful.length,
        failed: failed.length,
        percentage: Math.round((processedCount / items.length) * 100),
        currentBatch: batchIndex + 1,
        totalBatches,
        elapsedMs,
        estimatedRemainingMs: Math.round(avgTimePerItem * remainingItems),
      });
    }

    // Delay between batches (to avoid overwhelming resources)
    if (delayMs > 0 && batchIndex < batches.length - 1) {
      await delay(delayMs);
    }
  }

  return {
    successful,
    failed,
    totalProcessed: processedCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Process items with concurrency limit
 */
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if promise is settled by checking then
        const p = executing[i];
        if (await Promise.race([p.then(() => true), Promise.resolve(false)])) {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Simple delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    retryOn?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 2,
    retryOn = () => true,
  } = options;

  let lastError: Error;
  let currentDelay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !retryOn(lastError)) {
        throw lastError;
      }

      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * factor, maxDelayMs);
    }
  }

  throw lastError!;
}

/**
 * Run operations in parallel with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await processor(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Batch database upsert helper
 */
export interface UpsertOptions {
  conflictColumns: string[];
  updateColumns?: string[];
  chunkSize?: number;
}

export function generateBatchUpsertSQL(
  tableName: string,
  columns: string[],
  values: any[][],
  options: UpsertOptions,
): string {
  const { conflictColumns, updateColumns, chunkSize = 1000 } = options;

  // Generate placeholders
  const placeholders = values
    .slice(0, chunkSize)
    .map((row, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`);
      return `(${rowPlaceholders.join(', ')})`;
    })
    .join(', ');

  // Generate conflict clause
  const conflictClause = conflictColumns.join(', ');

  // Generate update clause
  const updateCols = updateColumns || columns.filter((c) => !conflictColumns.includes(c));
  const updateClause = updateCols.map((col) => `"${col}" = EXCLUDED."${col}"`).join(', ');

  return `
    INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')})
    VALUES ${placeholders}
    ON CONFLICT (${conflictClause})
    DO UPDATE SET ${updateClause}, "updatedAt" = NOW()
    RETURNING *
  `;
}

/**
 * Stream processor for large datasets
 */
export async function* streamBatch<T>(
  source: AsyncIterable<T>,
  batchSize: number,
): AsyncGenerator<T[]> {
  let batch: T[] = [];

  for await (const item of source) {
    batch.push(item);

    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(tokens: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= tokens) {
        this.tokens -= tokens;
        return;
      }

      // Wait for refill
      const tokensNeeded = tokens - this.tokens;
      const waitTime = (tokensNeeded / this.refillRate) * 1000;
      await delay(waitTime);
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

/**
 * Debounce batch operations
 */
export function createBatchDebouncer<T, R>(
  processor: (items: T[]) => Promise<R[]>,
  options: { maxWaitMs?: number; maxBatchSize?: number } = {},
): (item: T) => Promise<R> {
  const { maxWaitMs = 100, maxBatchSize = 100 } = options;

  let batch: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  let timer: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (batch.length === 0) return;

    const currentBatch = batch;
    batch = [];
    timer = null;

    try {
      const results = await processor(currentBatch.map((b) => b.item));
      currentBatch.forEach((b, i) => b.resolve(results[i]));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      currentBatch.forEach((b) => b.reject(err));
    }
  };

  return (item: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      batch.push({ item, resolve, reject });

      if (batch.length >= maxBatchSize) {
        if (timer) clearTimeout(timer);
        flush();
      } else if (!timer) {
        timer = setTimeout(flush, maxWaitMs);
      }
    });
  };
}
