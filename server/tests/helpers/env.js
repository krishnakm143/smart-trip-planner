process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-in-tests';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.GOOGLE_MAPS_API_KEY = '';
