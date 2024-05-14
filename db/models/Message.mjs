import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
    },
    nicknameToNickname: { type: String },
    message: { type: String },
    sender: {type: String}
  },
  {
    timestamps: true,
    collection: "message",
  }
);

export default mongoose.model("Message", MessageSchema);
