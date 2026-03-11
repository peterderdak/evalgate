import Ajv, { type ErrorObject } from "ajv/dist/ajv.js";
import addFormats from "ajv-formats/dist/index.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export function validateSchemaOutput(schema: Record<string, unknown>, actual: unknown) {
  const validate = ajv.compile(schema);
  const valid = validate(actual);
  return {
    valid: Boolean(valid),
    errors: (validate.errors ?? []).map((error: ErrorObject) =>
      `${error.instancePath || "/"} ${error.message ?? "invalid"}`.trim()
    )
  };
}
