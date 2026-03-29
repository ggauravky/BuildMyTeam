process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_for_ci";
process.env.JWT_EXPIRES_IN = "2h";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/hackteam_test";
