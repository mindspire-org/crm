
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

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'mindspire' });
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@crm.healthspire.org';
    const adminUsername = 'admin';

    const user = await User.findOne({ 
      $or: [{ email: adminEmail }, { username: adminUsername }] 
    });

    if (!user) {
      console.log('Admin user NOT FOUND in database.');
      process.exit(0);
    }

    console.log('Admin User Found:');
    console.log('- Email:', user.email);
    console.log('- Username:', user.username);
    console.log('- Role:', user.role);
    console.log('- Status:', user.status);
    console.log('- Has Password Hash:', !!user.passwordHash);

    // Test default password '123'
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare('123', user.passwordHash);
      console.log('- Password "123" matches:', isMatch);
      console.log('- Raw Password Hash:', user.passwordHash);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAdmin();
