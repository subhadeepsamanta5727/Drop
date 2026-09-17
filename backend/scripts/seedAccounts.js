const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDb = require('../config/db');
const User = require('../models/User');

const accounts = [
  {
    name: process.env.ADMIN_NAME || 'AlphaDrop Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'ADMIN'
  },
  {
    name: process.env.USER_NAME || 'AlphaDrop User',
    email: process.env.USER_EMAIL,
    password: process.env.USER_PASSWORD,
    role: 'USER'
  }
];

const validateAccounts = () => {
  for (const account of accounts) {
    if (!account.email || !account.password) {
      throw new Error(`Missing credentials for ${account.role}. Set ${account.role}_EMAIL and ${account.role}_PASSWORD.`);
    }

    if (account.password.length < 8) {
      throw new Error(`${account.role}_PASSWORD must be at least 8 characters.`);
    }
  }
};

const seed = async () => {
  validateAccounts();
  await connectDb();

  for (const account of accounts) {
    const password = await bcrypt.hash(account.password, 12);
    await User.findOneAndUpdate(
      { email: account.email.trim().toLowerCase() },
      {
        $set: {
          name: account.name.trim(),
          email: account.email.trim().toLowerCase(),
          password,
          role: account.role
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Seeded ${account.role} account: ${account.email.trim().toLowerCase()}`);
  }
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });