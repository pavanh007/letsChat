import mongoose from "mongoose";

const connectToMongoDB = async () => {
  const maxRetries = process.env.CONNECTION_RETRIES;
  const retryDelay = process.env.DB_INTERVAL_IN_MS;
  let retryCount = 0;
  
  const attemptConnection = async () => {
    try {
      await mongoose.connect(process.env.DB_CONN_URI);
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error.message);
      if (retryCount < maxRetries) {
        console.log(`Retrying connection (${retryCount + 1}/${maxRetries})...`);
        retryCount++;
        setTimeout(attemptConnection, retryDelay);
      } else {
        console.error(
          "Max retries exceeded. Could not establish MongoDB connection."
        );
      }
    }
  };

  mongoose.connection.on("connected", () => {
    console.log("Database: connection established");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB connection disconnected");
    attemptConnection();
  });

  attemptConnection();
};

export default connectToMongoDB;
