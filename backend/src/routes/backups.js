import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Backup from '../models/Backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get all backups
router.get('/', async (req, res) => {
  try {
    const backups = await Backup.find().sort({ createdAt: -1 });
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create manual backup
router.post('/create', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};

    for (const collection of collections) {
      const data = await mongoose.connection.db.collection(collection.name).find({}).toArray();
      backupData[collection.name] = data;
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    const backup = new Backup({
      filename,
      path: filePath,
      size: fs.statSync(filePath).size,
      trigger: 'manual',
      status: 'success'
    });

    await backup.save();
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/restore/:id', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    const backupData = JSON.parse(fs.readFileSync(backup.path, 'utf8'));

    // Clear and restore each collection
    for (const [collectionName, data] of Object.entries(backupData)) {
      await mongoose.connection.db.collection(collectionName).deleteMany({});
      if (data.length > 0) {
        // Remove _id from data to avoid conflicts if they are being re-inserted
        // Actually, for a full restore, keeping _id is usually better to maintain links
        await mongoose.connection.db.collection(collectionName).insertMany(data);
      }
    }

    res.json({ message: 'System restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:id', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    if (fs.existsSync(backup.path)) {
      fs.unlinkSync(backup.path);
    }

    await Backup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Backup deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// Auto backup function for cron
export const performAutoBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `auto-backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};

    for (const collection of collections) {
      const data = await mongoose.connection.db.collection(collection.name).find({}).toArray();
      backupData[collection.name] = data;
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    const backup = new Backup({
      filename,
      path: filePath,
      size: fs.statSync(filePath).size,
      trigger: 'auto',
      status: 'success'
    });

    await backup.save();
    console.log(`[Auto-Backup] Success: ${filename}`);
  } catch (error) {
    console.error(`[Auto-Backup] Failed: ${error.message}`);
  }
};
