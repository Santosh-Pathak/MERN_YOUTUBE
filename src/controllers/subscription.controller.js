import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid channelId");
    }

    const subscriberId = req.user._id;

    const channel = await User.findById(channelId);
    if (!channel) {
      throw new ApiError(404, "Channel not found");
    }

    const existing = await Subscription.findOne({
      subscriber: subscriberId,
      channel: channelId,
    });

    if (existing) {
      await Subscription.deleteOne({ _id: existing._id });
      return res.status(200).json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed successfully"));
    }

    await Subscription.create({ subscriber: subscriberId, channel: channelId });
    return res.status(200).json(new ApiResponse(200, { isSubscribed: true }, "Subscribed successfully"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid channelId");
    }

    const subscribers = await Subscription.find({ channel: channelId })
      .populate("subscriber", "username fullName avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(
        200,
        { subscribers, total: subscribers.length },
        "Subscribers fetched successfully"
      )
    );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
      throw new ApiError(400, "Invalid subscriberId");
    }

    const channels = await Subscription.find({ subscriber: subscriberId })
      .populate("channel", "username fullName avatar coverImage")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(
        200,
        { subscribedChannels: channels, total: channels.length },
        "Subscribed channels fetched successfully"
      )
    );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}