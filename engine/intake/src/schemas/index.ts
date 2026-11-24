// Schema đầu ra mô hình (MOD-INT-15) và bộ kiểm dùng chung Ajv của @gamestudio/schema (ADR-021).
import { createAjv, toError, type ValidationError } from '@gamestudio/schema';

import analysisSchema from './analysis.schema.json' with { type: 'json' };
import briefSchema from './brief.schema.json' with { type: 'json' };
import clarifySchema from './clarify.schema.json' with { type: 'json' };

export const SCHEMAS = { analysis: analysisSchema, clarify: clarifySchema, brief: briefSchema } as const;

type Validate = ((data: unknown) => boolean) & { errors?: Parameters<typeof toError>[0][] | null };

let ajv: ReturnType<typeof createAjv> | undefined;
const cache = new WeakMap<object, Validate>();

/** Kiểm `data` theo một JSON Schema bất kỳ (schema của intake hoặc outputSchema trong res-<n>.json). */
export function validateOutput(schema: object, data: unknown): ValidationError[] {
  let fn = cache.get(schema);
  if (fn === undefined) {
    ajv ??= createAjv();
    const id = (schema as { $id?: unknown }).$id;
    const known = typeof id === 'string' ? ajv.getSchema(id) : undefined;
    fn = (known ?? ajv.compile(schema)) as Validate;
    cache.set(schema, fn);
  }
  return fn(data) ? [] : (fn.errors ?? []).map(toError);
}
