
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindspire';

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  passwordHash: String,
  role: String,
  status: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function resetAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'mindspire' });
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@crm.healthspire.org';
    const newPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const result = await User.updateOne(
      { email: adminEmail },
      { 
        $set: { 
          passwordHash: passwordHash,
          role: 'admin',
          status: 'active'
        } 
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log('Admin user created with password "123"');
    } else {
      console.log('Admin user password updated to "123"');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

resetAdmin();
