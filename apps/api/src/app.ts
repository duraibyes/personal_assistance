import express, { Request, Response, NextFunction, Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from './routes/auth.routes';
import documentsRouter from './routes/documents.routes';
import { loansRouter } from './routes/loans.routes';
import { expensesRouter } from './routes/expenses.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { requireAuth, getJwtSecret } from './middleware/auth.middleware';
import { setupSwagger } from './swagger';

// Fail fast in production if JWT secret missing
getJwtSecret();

const app: Express = express();

app.use(helmet({
  contentSecurityPolicy: false, // allow swagger UI assets
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || true,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Dashboard]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/loans", requireAuth, loansRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
