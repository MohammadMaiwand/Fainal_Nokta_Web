import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const bookSchema = createBaseSchema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    title: { type: String, required: true, trim: true, index: true },
    author: { type: String, trim: true, default: '' },
    isbn: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: 'General', trim: true, index: true },
    stockQuantity: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    available: { type: Boolean, default: true, index: true },
    description: { type: String, trim: true, default: '' }
  },
  { collection: 'books' }
);

bookSchema.index({ branchId: 1, title: 1 });
bookSchema.index({ isbn: 1, branchId: 1 }, { unique: true, sparse: true });

export const Book = mongoose.models.Book ?? mongoose.model('Book', bookSchema);
