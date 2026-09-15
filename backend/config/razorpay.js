const Razorpay = require('razorpay');
const env = require('./env');

const hasGatewayCredentials = Boolean(env.razorpayKeyId && env.razorpayKeySecret && env.razorpayKeyId !== 'test_key_id');

const razorpay = hasGatewayCredentials
  ? new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret
    })
  : {
      orders: {
        create: async ({ amount, currency, receipt, notes }) => ({
          id: `mock_order_${Date.now()}`,
          amount,
          currency: currency || 'INR',
          receipt: receipt || 'mock_receipt',
          status: 'created',
          notes: notes || {},
        }),
      },
    };

module.exports = razorpay;
module.exports.hasGatewayCredentials = hasGatewayCredentials;
