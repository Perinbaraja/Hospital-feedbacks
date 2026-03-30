import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const connectDB = async (retryCount = 5) => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 45000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error(error.message);

    if (error.message.includes('ETIMEOUT') || error.message.includes('querySrv')) {
      console.error('\n📡 DNS/Network Error detected.');
      console.error('💡 TIP: Check your internet connection or DNS settings.');
      console.error('💡 TIP: Ensure your MongoDB Atlas connection string is correct.');
    }

    if (error.message.includes('whitelisted')) {
      console.error('\n💡 TIP: Make sure your current IP is whitelisted in MongoDB Atlas.');
      console.error('   Visit: https://www.mongodb.com/docs/atlas/security-whitelist/');
    }

    if (retryCount > 0) {
      console.log(`🔄 Retrying connection in 5 seconds... (${retryCount} retries left)`);
      setTimeout(() => connectDB(retryCount - 1), 5000);
    } else {
      console.error('\n💥 Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

connectDB();


