import { ZodError } from "zod";

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      req.body = parsed.data;
      return next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request",
          issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      return next(e);
    }
  };
};
