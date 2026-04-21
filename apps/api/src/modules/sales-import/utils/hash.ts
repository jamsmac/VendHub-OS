/**
 * DJB2 hash — fast, non-cryptographic, deterministic.
 * Used for dedup keys (row-level L1 and txn-level L2).
 */
export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash | 0; // Convert to 32-bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** L1: row-level hash — whole-row fingerprint for exact re-upload detection. */
export function hashRow(
  reportDay: string,
  machineId: string,
  cols: readonly string[],
): string {
  return djb2Hash(`row:${reportDay}|${machineId}|${cols.join("|")}`);
}

/** L2: transaction-level hash — when a txn ID column is mapped. */
export function hashTxn(txnRaw: string, productId: string): string {
  return djb2Hash(`txn:${txnRaw}|${productId}`);
}
