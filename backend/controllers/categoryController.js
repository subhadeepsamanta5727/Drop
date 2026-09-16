const Category = require('../models/Category');
const Package = require('../models/Package');

const slugify = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

const syncExistingPackages = async () => {
  const packages = await Package.find({}).lean();
  for (const pkg of packages) {
    await Category.findOneAndUpdate(
      { categoryType: 'ONE_TIME_CATEGORY', category: pkg.category },
      {
        $setOnInsert: {
          title: pkg.title,
          category: pkg.category,
          categoryType: 'ONE_TIME_CATEGORY',
          note: pkg.description || '',
          slug: pkg.slug || slugify(pkg.category),
          price: pkg.price,
          priceInPaise: pkg.priceInPaise,
          isActive: pkg.isActive
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
};

const syncPackageCategory = async (categoryDocument) => {
  if (categoryDocument.categoryType !== 'ONE_TIME_CATEGORY') return;

  await Package.findOneAndUpdate(
    { category: categoryDocument.category },
    {
      $set: {
        title: categoryDocument.title,
        category: categoryDocument.category,
        slug: categoryDocument.slug,
        price: categoryDocument.price,
        priceInPaise: categoryDocument.priceInPaise,
        description: categoryDocument.note,
        isActive: categoryDocument.isActive
      }
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

exports.getCategories = async (req, res, next) => {
  try {
    await syncExistingPackages();
    const query = { isActive: true };
    if (req.query.type) query.categoryType = String(req.query.type).toUpperCase();

    const categories = await Category.find(query).sort({ categoryType: 1, title: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.getAllCategories = async (_req, res, next) => {
  try {
    await syncExistingPackages();
    const categories = await Category.find({}).sort({ categoryType: 1, title: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { title, category, categoryType, note, price, isActive } = req.body || {};
    const normalizedType = String(categoryType || '').toUpperCase();
    const normalizedCategory = String(category || '').toUpperCase().trim();

    if (!title || !normalizedCategory || !['SUBSCRIPTION_DAILY', 'ONE_TIME_CATEGORY'].includes(normalizedType)) {
      const error = new Error('title, category, and a valid categoryType are required');
      error.statusCode = 400;
      throw error;
    }

    if (normalizedType === 'ONE_TIME_CATEGORY' && (price === undefined || Number(price) <= 0)) {
      const error = new Error('A positive price is required for one-time categories');
      error.statusCode = 400;
      throw error;
    }

    const categoryDocument = await Category.create({
      title: String(title).trim(),
      category: normalizedCategory,
      categoryType: normalizedType,
      note: note ? String(note).trim() : '',
      slug: slugify(normalizedCategory),
      price: normalizedType === 'ONE_TIME_CATEGORY' ? Number(price) : null,
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    await syncPackageCategory(categoryDocument);
    res.status(201).json({ success: true, data: categoryDocument });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const categoryDocument = await Category.findById(req.params.id);
    if (!categoryDocument) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    const { title, category, note, price, isActive } = req.body || {};
    if (title !== undefined) categoryDocument.title = String(title).trim();
    if (category !== undefined) {
      categoryDocument.category = String(category).toUpperCase().trim();
      categoryDocument.slug = slugify(categoryDocument.category);
    }
    if (note !== undefined) categoryDocument.note = String(note).trim();
    if (categoryDocument.categoryType === 'ONE_TIME_CATEGORY' && price !== undefined) {
      if (Number(price) <= 0) {
        const error = new Error('Price must be greater than zero');
        error.statusCode = 400;
        throw error;
      }
      categoryDocument.price = Number(price);
    }
    if (typeof isActive === 'boolean') categoryDocument.isActive = isActive;

    await categoryDocument.save();
    await syncPackageCategory(categoryDocument);
    res.json({ success: true, data: categoryDocument });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryDocument = await Category.findByIdAndDelete(req.params.id);
    if (!categoryDocument) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    if (categoryDocument.categoryType === 'ONE_TIME_CATEGORY') {
      await Package.findOneAndUpdate(
        { category: categoryDocument.category },
        { $set: { isActive: false } }
      );
    }

    res.json({ success: true, data: { deletedId: categoryDocument._id } });
  } catch (error) {
    next(error);
  }
};
