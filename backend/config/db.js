const mongoose = require('mongoose');
const env = require('./env');
module.exports = async () => {
  if (!env.mongoUri) throw new Error('MONGO_URI is required');
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
};
