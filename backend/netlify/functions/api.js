import serverless from 'serverless-http';
import mongoose from 'mongoose';
import appModule from '../../app.js';

const app = appModule?.default ?? appModule;
if (!app || typeof app.use !== 'function') {
  throw new Error('Invalid app object loaded for Netlify function. Expected Express app instance.');
}

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection?.readyState === 1) {
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in Netlify environment variables');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  }

  await connectionPromise;
}

const handler = serverless(app);

export async function handlerFn(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDB();
  return handler(event, context);
}

export { handlerFn as handler };
