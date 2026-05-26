const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Expense = require('../models/expenseModel');
const { classifyReceipt } = require('../services/geminiService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only JPEG, PNG, and WEBP images are allowed.'));
  },
});

function buildImageUrl(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
  return `/${relativePath}`;
}

router.get('/', async (_req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image upload is required.' });
    }

    const category = await classifyReceipt(req.file.path);

    const expense = await Expense.create({
      title: req.body.title,
      amount: Number(req.body.amount),
      category,
      imageUrl: buildImageUrl(req.file.path),
      date: req.body.date || Date.now(),
    });

    return res.status(201).json({ success: true, expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existingExpense = await Expense.findById(req.params.id);

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const updateData = {
      title: req.body.title ?? existingExpense.title,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : existingExpense.amount,
      date: req.body.date ?? existingExpense.date,
    };

    if (req.file) {
      updateData.imageUrl = buildImageUrl(req.file.path);
      updateData.category = await classifyReceipt(req.file.path);
    } else {
      updateData.category = existingExpense.category;
      updateData.imageUrl = existingExpense.imageUrl;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.json({ success: true, expense: updatedExpense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const imageFilePath = path.join(__dirname, '..', expense.imageUrl.replace(/^\//, ''));

    if (fs.existsSync(imageFilePath)) {
      fs.unlinkSync(imageFilePath);
    }

    return res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
