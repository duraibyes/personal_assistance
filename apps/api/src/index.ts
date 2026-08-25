import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { documentsRouter } from './routes/documents.routes';
import { loansRouter } from './routes/loans.routes';
import { expensesRouter } from './routes/expenses.routes';
import { dashboardRouter } from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Document Upload & OCR routes
app.use("/api/documents", documentsRouter);
app.use("/api/loans", loansRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/dashboard", dashboardRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
