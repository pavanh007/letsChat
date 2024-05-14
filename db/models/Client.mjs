import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
  {
    connectionId: { type: String, unique: true, index: true },
    nickname: { type: String },
  },
  {
    timestamps: true,
    collection: "client",
  }
);

export default mongoose.model("Client", ClientSchema);
