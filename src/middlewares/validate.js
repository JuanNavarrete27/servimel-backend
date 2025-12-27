const { AppError } = require('../utils/responses');

/**
 * Minimal validator:
 * schema: { body: { field: { required, type, min, max, enum, regex } }, query: {...}, params: {...} }
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.params) validateObj(req.params, schema.params, 'params');
      if (schema.query) validateObj(req.query, schema.query, 'query');
      if (schema.body) validateObj(req.body, schema.body, 'body');
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function validateObj(obj, rules, where) {
  const details = [];
  for (const [key, rule] of Object.entries(rules)) {
    const val = obj ? obj[key] : undefined;
    const isMissing = val === undefined || val === null || val === '';
    if (rule.required && isMissing) {
      details.push({ field: key, where, issue: 'required' });
      continue;
    }
    if (isMissing) continue;

    const type = rule.type;
    if (type) {
      const okType =
        (type === 'string' && typeof val === 'string') ||
        (type === 'number' && !Number.isNaN(Number(val))) ||
        (type === 'boolean' && (val === true || val === false || val === 'true' || val === 'false'));
      if (!okType) details.push({ field: key, where, issue: `type_${type}` });
    }

    const s = typeof val === 'string' ? val : String(val);

    if (rule.min !== undefined && s.length < rule.min) details.push({ field: key, where, issue: 'min' });
    if (rule.max !== undefined && s.length > rule.max) details.push({ field: key, where, issue: 'max' });
    if (rule.enum && !rule.enum.includes(val)) details.push({ field: key, where, issue: 'enum' });
    if (rule.regex) {
      const re = new RegExp(rule.regex);
      if (!re.test(s)) details.push({ field: key, where, issue: 'regex' });
    }
  }

  if (details.length) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, details);
  }
}

module.exports = { validate };
