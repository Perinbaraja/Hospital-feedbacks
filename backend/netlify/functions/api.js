import serverless from 'serverless-http';
import mongoose from 'mongoose';
import appModule from '../../app.js';

const app = appModule?.default ?? appModule;

if (!app || typeof app.use !== 'function') {
  throw new Error('Invalid app object loaded for Netlify function.');
}

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection?.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 45000,
      socketTimeoutMS: 45000,
    });
  }

  await connectionPromise;
}

// ✅ SAFE BODY PARSER (FINAL FIX)
const handler = serverless(app, {
  request: (req, event) => {
    try {
      if (
        event.body &&
        typeof event.body === 'string' &&
        event.headers['content-type']?.includes('application/json')
      ) {
        req.body = JSON.parse(event.body);
      }
    } catch (err) {
      console.error('Body parse failed:', err);
      req.body = {};
    }
  }
});

export const handlerFn = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  await connectDB();

  return handler(event, context);
};

// ✅ Netlify expects THIS export name
export { handlerFn as handler };