require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const connectDb = require('./config/db');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const privateStoragePath = path.resolve(__dirname, 'private_storage');

fs.mkdirSync(privateStoragePath, { recursive: true });

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/webhook', require('./routes/webhookRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`AlphaDrop API listening on ${env.port}`);
    });
  })
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
