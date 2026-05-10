const mongoose = require('mongoose');

let memoryServer = null;

// MongoDB连接配置
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PetDerma_Community';
    console.log(`🔌 尝试连接 MongoDB: ${uri.replace(/\/\/.*@/, '//***@')}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB 已连接: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ 远程 MongoDB 连接失败:', error.message);
    console.log('🔄 尝试启动本地内存数据库...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const localUri = memoryServer.getUri();

      console.log(`📦 内存数据库已启动: ${localUri}`);

      const conn = await mongoose.connect(localUri);
      console.log(`✅ 内存 MongoDB 已连接: ${conn.connection.host}`);
      return conn;
    } catch (memError) {
      console.error('❌ 内存数据库启动失败:', memError.message);
      process.exit(1);
    }
  }
};

// 连接事件监听
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// 优雅关闭
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
  }
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;
