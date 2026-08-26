import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WealthGuard Personal Finance API',
      version: '1.0.0',
      description:
        'REST API for the WealthGuard web and mobile apps. Authenticate with JWT Bearer tokens from /api/auth/login or /api/auth/signup.',
    },
    servers: [
      ...(process.env.VERCEL_URL
        ? [{ url: `https://${process.env.VERCEL_URL}`, description: 'Production' }]
        : []),
      { url: `http://localhost:${process.env.PORT || 5000}`, description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Loans', description: 'Loan management' },
      { name: 'Expenses', description: 'Expense tracking' },
      { name: 'Documents', description: 'Document upload and OCR' },
      { name: 'Dashboard', description: 'Dashboard summaries' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}
