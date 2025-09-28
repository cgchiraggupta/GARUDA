const express = require('express');
const routesRouter = require('./routes');
const tracksRouter = require('./tracks');
const defectsRouter = require('./defects');
const maintenanceRouter = require('./maintenance');
const analyticsRouter = require('./analytics');
const alertsRouter = require('./alerts');

const router = express.Router();

// API versioning
router.use('/v1', routesRouter);
router.use('/v1', tracksRouter);
router.use('/v1', defectsRouter);
router.use('/v1', maintenanceRouter);
router.use('/v1', analyticsRouter);
router.use('/v1', alertsRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;