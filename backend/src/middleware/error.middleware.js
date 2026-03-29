const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found." });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const response = {
    message: err.message || "Internal server error.",
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
