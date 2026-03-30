import serverless from 'serverless-http';
import mongoose from 'mongoose';
import appModule from '../../app.js';

const app = appModule?.default ?? appModule;

if (!app || typeof app.use !== 'function') {
  throw new Error('Invalid app object loaded for Netlify function.');
}

let connectionPromise = null;

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false);

async function connectDB() {
  if (mongoose.connection?.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 45000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  await connectionPromise;
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost; clearing cache for next Netlify request.');
  connectionPromise = null;
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// ✅ SAFE BODY PARSER (FINAL FIX)
const handler = serverless(app, {
  request: (req, event) => {
    try {
      const headers = Object.entries(event.headers || {}).reduce((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
      }, {});
      const contentType = headers['content-type'] || '';

      if (event.body) {
        if (typeof event.body === 'string') {
          let bodyString = event.body;
          if (event.isBase64Encoded) {
            bodyString = Buffer.from(event.body, 'base64').toString('utf8');
          }
          if (contentType.includes('application/json')) {
            req.body = JSON.parse(bodyString);
          }
        } else if (typeof event.body === 'object') {
          req.body = event.body;
        }
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