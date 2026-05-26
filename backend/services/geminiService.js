const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const allowedCategories = ['Food', 'Shopping', 'Travel', 'Medical', 'Entertainment', 'Utilities'];

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      throw new Error('Unsupported image type. Use PNG, JPG, or WEBP.');
  }
}

function normalizeCategory(rawText) {
  const cleanedText = rawText.trim().replace(/[^A-Za-z\s]/g, '');

  const match = allowedCategories.find(
    (category) => category.toLowerCase() === cleanedText.toLowerCase()
  );

  return match || cleanedText || 'Utilities';
}

async function classifyReceipt(imagePath) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in the environment.');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = getMimeType(imagePath);

  const prompt =
    'Classify this receipt or bill image into exactly one of these categories: Food, Shopping, Travel, Medical, Entertainment, Utilities. Return only the category name.';

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ],
  });

  const text = response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return normalizeCategory(text);
}

module.exports = { classifyReceipt };
