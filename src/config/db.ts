import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cricbuzz_ts';
  try {
    await mongoose.connect(uri, { });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', (error as Error).message);
    process.exit(1);
  }
};

export default connectDB;
