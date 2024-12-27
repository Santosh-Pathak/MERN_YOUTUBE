import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    Subscriber: {
      type: Schema.Types.ObjectId, // on whwo is subscribing
      required: true,
      ref: "User",
    },
    Channel: {
      type: Schema.Types.ObjectId, // on whwo is sSubscribed
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
