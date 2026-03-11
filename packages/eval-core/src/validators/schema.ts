import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export function validateSchemaOutput(schema: Record<string, unknown>, actual: unknown) {
  const validate = ajv.compile(schema);
  const valid = validate(actual);
  return {
    valid: Boolean(valid),
    errors: (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`.trim())
  };
}
