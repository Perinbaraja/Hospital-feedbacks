import serverless from 'serverless-http';
import mongoose from 'mongoose';
import app from '../../app.js';

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return; // already connected
  }

  if (!connectionPromise) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required in Netlify environment variables');
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await connectionPromise;
  } else {
    await connectionPromise;
  }
}

const handler = serverless(app);

export async function handlerFn(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDB();
  return handler(event, context);
}

export { handlerFn as handler };
