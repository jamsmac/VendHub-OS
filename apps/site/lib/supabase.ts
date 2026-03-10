/**
 * Supabase Adapter — Lightweight query builder backed by static data.
 *
 * Replaces @supabase/supabase-js with zero external dependencies.
 * READ operations return data from lib/data.ts fallback arrays.
 * WRITE operations return errors indicating VendHub API migration.
 *
 * This adapter exists so that all 21 consumer files compile and run
 * without @supabase/supabase-js. All operations will eventually be
 * replaced by VendHub API calls.
 *
 * @deprecated Migrate each consumer to the VendHub API as endpoints
 * become available (POST /api/v1/products, etc.).
 */

import {
  products,
  machines,
  promotions,
  loyaltyTiers,
  bonusActions,
  loyaltyPrivileges,
  siteContent,
  partners,
  partnershipModels,
} from "./data";

// ── Table → static data mapping ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const TABLE_DATA: Record<string, Row[]> = {
  products,
  machines,
  promotions,
  loyalty_tiers: loyaltyTiers,
  bonus_actions: bonusActions,
  loyalty_privileges: loyaltyPrivileges,
  site_content: siteContent,
  partners,
  partnership_models: partnershipModels,
  // Tables without static data — reads return [], writes return errors
  machine_types: [],
  cooperation_requests: [],
};

// ── Response types ─────────────────────────────────────────────────────

interface QueryResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: { message: string } | null;
  count?: number | null;
}

// ── Mutation builder (insert/update/delete/upsert) ─────────────────────

class MutationBuilder implements PromiseLike<QueryResponse> {
  constructor(private _table: string) {}

  eq(_column: string, _value: unknown): this {
    return this;
  }

  in(_column: string, _values: unknown[]): this {
    return this;
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const result: QueryResponse = {
      data: null,
      error: {
        message: `[MIGRATION] Write operations on "${this._table}" require VendHub API. Supabase has been removed.`,
      },
    };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

// ── Query builder (select chain) ───────────────────────────────────────

class QueryBuilder implements PromiseLike<QueryResponse> {
  private _items: Row[];
  private _filters: Array<(items: Row[]) => Row[]> = [];
  private _orderBy: Array<{ column: string; ascending: boolean }> = [];
  private _limitCount?: number;
  private _selectColumns?: string;
  private _headOnly = false;
  private _single = false;
  private _table: string;

  constructor(table: string) {
    this._table = table;
    this._items = [...(TABLE_DATA[table] ?? [])];
  }

  select(columns = "*", options?: { count?: string; head?: boolean }): this {
    this._selectColumns = columns;
    if (options?.head) this._headOnly = true;
    return this;
  }

  eq(column: string, value: unknown): this {
    this._filters.push((items) =>
      items.filter((item) => item[column] === value),
    );
    return this;
  }

  neq(column: string, value: unknown): this {
    this._filters.push((items) =>
      items.filter((item) => item[column] !== value),
    );
    return this;
  }

  in(column: string, values: unknown[]): this {
    this._filters.push((items) =>
      items.filter((item) => values.includes(item[column])),
    );
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orderBy.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number): this {
    this._limitCount = count;
    return this;
  }

  maybeSingle(): this {
    this._single = true;
    return this;
  }

  // ── Mutation entry points ──────────────────────────────────────────

  insert(_payload: unknown): MutationBuilder {
    return new MutationBuilder(this._table);
  }

  update(_payload: unknown): MutationBuilder {
    return new MutationBuilder(this._table);
  }

  delete(): MutationBuilder {
    return new MutationBuilder(this._table);
  }

  upsert(_payload: unknown, _options?: unknown): MutationBuilder {
    return new MutationBuilder(this._table);
  }

  // ── Execute ────────────────────────────────────────────────────────

  private _execute(): QueryResponse {
    let result = [...this._items];

    // Apply filters
    for (const filter of this._filters) {
      result = filter(result);
    }

    // Apply ordering (stable: apply in reverse so first .order() is primary)
    for (let i = this._orderBy.length - 1; i >= 0; i--) {
      const { column, ascending } = this._orderBy[i];
      result.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return ascending ? 1 : -1;
        if (bVal == null) return ascending ? -1 : 1;
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this._limitCount !== undefined) {
      result = result.slice(0, this._limitCount);
    }

    // Head-only: return count without data
    if (this._headOnly) {
      return { data: null, error: null, count: result.length };
    }

    // Single-row mode
    if (this._single) {
      return { data: result[0] ?? null, error: null };
    }

    // Column projection (e.g. "slug, name" → pick only those columns)
    if (this._selectColumns && this._selectColumns !== "*") {
      const cols = this._selectColumns.split(",").map((c) => c.trim());
      result = result.map((item) => {
        const picked: Row = {};
        for (const col of cols) {
          if (col in item) picked[col] = item[col];
        }
        return picked;
      });
    }

    return { data: result, error: null };
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      return Promise.resolve(this._execute()).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(null, onrejected);
    }
  }
}

// ── Auth stub ──────────────────────────────────────────────────────────

type Session = { user: { email: string | null } } | null;

const auth = {
  getSession: async () => ({
    data: { session: null as Session },
    error: null,
  }),
  onAuthStateChange: (
    _callback: (event: string, session: Session) => void,
  ) => ({
    data: {
      subscription: {
        unsubscribe: () => {},
      },
    },
  }),
};

// ── Storage stub ───────────────────────────────────────────────────────

const storage = {
  from: (_bucket: string) => ({
    upload: async () => ({
      data: null,
      error: { message: "Storage migrated to VendHub API" },
    }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    remove: async () => ({
      data: null,
      error: { message: "Storage migrated to VendHub API" },
    }),
  }),
};

// ── Channel stub ───────────────────────────────────────────────────────

function channel(_name: string) {
  const noop = () => channelInstance;
  const channelInstance = {
    on: noop,
    subscribe: noop,
    unsubscribe: () => {},
  };
  return channelInstance;
}

// ── Public API ─────────────────────────────────────────────────────────

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  auth,
  storage,
  channel,
};
