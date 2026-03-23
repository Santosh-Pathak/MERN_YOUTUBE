import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // on whwo is subscribing
      required: true,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // on whwo is sSubscribed
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
