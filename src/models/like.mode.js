
import mongoose, {Schema} from "mongoose";


const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    reactionType: {
        type: String,
        enum: ["like", "dislike"],
        default: "like",
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    
}, {timestamps: true})

// Allow one reaction per (target,user,reactionType) and manage mutual exclusivity in controller.
likeSchema.index({ video: 1, likedBy: 1, reactionType: 1 });
likeSchema.index({ comment: 1, likedBy: 1 });
likeSchema.index({ tweet: 1, likedBy: 1 });

export const Like = mongoose.model("Like", likeSchema)
