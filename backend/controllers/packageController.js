const Package = require('../models/Package');
const Pricing = require('../models/Pricing');
const Category = require('../models/Category');

const DEFAULT_PACKAGES = [
  {
    title: 'Crypto Alpha Vault',
    category: 'CRYPTO',
    slug: 'crypto-alpha-vault',
    price: 499,
    priceInPaise: 49900,
    description: 'Lifetime access to daily crypto signals, DeFi research, and on-chain intelligence drops.',
    thumbnail: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600&auto=format&fit=crop&q=80',
    isActive: true
  },
  {
    title: 'Equity & Stocks Intelligence',
    category: 'STOCKS',
    slug: 'equity-stocks-intelligence',
    price: 699,
    priceInPaise: 69900,
    description: 'Lifetime access to swing trade sheets, earnings analysis, and institutional flow alerts.',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    isActive: true
  },
  {
    title: 'Forex Macro Signals',
    category: 'FOREX',
    slug: 'forex-macro-signals',
    price: 599,
    priceInPaise: 59900,
    description: 'Lifetime access to major FX pairs analysis, central bank briefings, and daily macro setups.',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
    isActive: true
  },
  {
    title: 'General Market Alpha',
    category: 'GENERAL',
    slug: 'general-market-alpha',
    price: 399,
    priceInPaise: 39900,
    description: 'Lifetime access to daily aggregated market datasets, general summaries, and sentiment scores.',
    thumbnail: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&auto=format&fit=crop&q=80',
    isActive: true
  }
];

const seedDefaultPackagesIfEmpty = async () => {
  const count = await Package.countDocuments();
  if (count === 0) {
    for (const pkg of DEFAULT_PACKAGES) {
      await Package.create(pkg);
      // Also ensure Pricing record exists for backward compatibility
      await Pricing.findOneAndUpdate(
        { planType: 'ONE_TIME', category: pkg.category },
        {
          $set: {
            planType: 'ONE_TIME',
            category: pkg.category,
            priceInPaise: pkg.priceInPaise,
            currency: 'INR',
            isActive: true
          }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }
};

exports.getPackages = async (req, res, next) => {
  try {
    await seedDefaultPackagesIfEmpty();
    const packages = await Package.find({ isActive: true }).sort({ createdAt: 1 }).lean();
    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllPackages = async (req, res, next) => {
  try {
    await seedDefaultPackagesIfEmpty();
    const packages = await Package.find({}).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    next(error);
  }
};

exports.createPackage = async (req, res, next) => {
  try {
    const { title, category, price, description, thumbnail, isActive } = req.body || {};

    if (!title || !category || price === undefined) {
      const error = new Error('title, category, and price are required');
      error.statusCode = 400;
      throw error;
    }

    const normalizedCategory = String(category).toUpperCase().trim();
    const existing = await Package.findOne({ category: normalizedCategory });
    if (existing) {
      const error = new Error(`Package with category '${normalizedCategory}' already exists`);
      error.statusCode = 409;
      throw error;
    }

    const numPrice = Number(price);
    const newPkg = await Package.create({
      title: String(title).trim(),
      category: normalizedCategory,
      slug: normalizedCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: numPrice,
      priceInPaise: Math.round(numPrice * 100),
      description: description ? String(description).trim() : '',
      thumbnail: thumbnail ? String(thumbnail).trim() : '',
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    // Also update/sync Pricing model
    await Pricing.findOneAndUpdate(
      { planType: 'ONE_TIME', category: normalizedCategory },
      {
        $set: {
          planType: 'ONE_TIME',
          category: normalizedCategory,
          priceInPaise: Math.round(numPrice * 100),
          currency: 'INR',
          isActive: typeof isActive === 'boolean' ? isActive : true
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    await Category.findOneAndUpdate(
      { categoryType: 'ONE_TIME_CATEGORY', category: normalizedCategory },
      {
        $set: {
          title: newPkg.title,
          category: normalizedCategory,
          categoryType: 'ONE_TIME_CATEGORY',
          note: newPkg.description,
          slug: newPkg.slug,
          price: newPkg.price,
          priceInPaise: newPkg.priceInPaise,
          isActive: newPkg.isActive
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      data: newPkg
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, price, description, thumbnail, isActive } = req.body || {};

    const pkg = await Package.findById(id);
    if (!pkg) {
      const error = new Error('Package not found');
      error.statusCode = 404;
      throw error;
    }

    if (title) pkg.title = String(title).trim();
    if (category) {
      pkg.category = String(category).toUpperCase().trim();
      pkg.slug = pkg.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (price !== undefined) {
      pkg.price = Number(price);
      pkg.priceInPaise = Math.round(Number(price) * 100);
    }
    if (description !== undefined) pkg.description = String(description).trim();
    if (thumbnail !== undefined) pkg.thumbnail = String(thumbnail).trim();
    if (typeof isActive === 'boolean') pkg.isActive = isActive;

    await pkg.save();

    // Sync Pricing model
    await Pricing.findOneAndUpdate(
      { planType: 'ONE_TIME', category: pkg.category },
      {
        $set: {
          planType: 'ONE_TIME',
          category: pkg.category,
          priceInPaise: pkg.priceInPaise,
          currency: 'INR',
          isActive: pkg.isActive
        }
      },
      { upsert: true }
    );
    await Category.findOneAndUpdate(
      { categoryType: 'ONE_TIME_CATEGORY', category: pkg.category },
      {
        $set: {
          title: pkg.title,
          category: pkg.category,
          categoryType: 'ONE_TIME_CATEGORY',
          note: pkg.description,
          slug: pkg.slug,
          price: pkg.price,
          priceInPaise: pkg.priceInPaise,
          isActive: pkg.isActive
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: pkg
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await Package.findByIdAndDelete(id);
    if (!pkg) {
      const error = new Error('Package not found');
      error.statusCode = 404;
      throw error;
    }

    // Deactivate in pricing
    await Pricing.findOneAndUpdate(
      { planType: 'ONE_TIME', category: pkg.category },
      { $set: { isActive: false } }
    );
    await Category.findOneAndUpdate(
      { categoryType: 'ONE_TIME_CATEGORY', category: pkg.category },
      { $set: { isActive: false } }
    );

    res.json({
      success: true,
      data: { deletedId: id }
    });
  } catch (error) {
    next(error);
  }
};
