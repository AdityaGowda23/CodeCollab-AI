import dotenv from 'dotenv';
dotenv.config();
import mongoose from "mongoose";

const mongoConnect = async () => {
  const url = process.env.MONGODB_URI;

  if (!url) {
    console.warn(
      "MongoDB: MONGODB_URI is not set — skipping database connection. " +
        "User auth and interview features will not persist data."
    );
    return;
  }

  try {
    const conn = await mongoose.connect(url);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
  }
};

export default mongoConnect;
