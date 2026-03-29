const validate = (schema, segment = "body") => (req, res, next) => {
  const result = schema.safeParse(req[segment]);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed.",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req[segment] = result.data;
  return next();
};

module.exports = {
  validate,
};
