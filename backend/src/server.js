const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration for subdomain support
const getOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    const baseDomain = process.env.BASE_DOMAIN || 'microcrop.app'
    return [
      `https://${baseDomain}`,
      `https://www.${baseDomain}`,
      `https://network.${baseDomain}`,
      `https://portal.${baseDomain}`,
    ]
  }
  // Development origins
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://network.localhost:3000',
    'http://network.localhost:3001',
    'http://portal.localhost:3000',
    'http://portal.localhost:3001',
  ]
}

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = getOrigins()
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`)
      console.warn(`[CORS] Allowed origins:`, allowedOrigins)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
const authRoutes = require('./api/routes/auth.routes');
const ussdRoutes = require('./api/routes/ussd.routes');
const farmerRoutes = require('./api/routes/farmer.routes');
const plotRoutes = require('./api/routes/plot.routes');
const policyRoutes = require('./api/routes/policy.routes');
const weatherRoutes = require('./api/routes/weather.routes');
const satelliteRoutes = require('./api/routes/satellite.routes');
const paymentRoutes = require('./api/routes/payment.routes');
const claimRoutes = require('./api/routes/claim.routes');
const adminRoutes = require('./api/routes/admin.routes');
const cooperativeRoutes = require('./api/routes/cooperative.routes');

app.use('/api/auth', authRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cooperative', cooperativeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log error details for debugging
  const errorResponse = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json(errorResponse);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   MicroCrop Backend Server Running    ║
╚═══════════════════════════════════════╝
  
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  Health Check: http://localhost:${PORT}/health
  
  Ready to serve requests...
  `);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
