import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        // If set, this comment is a 1-level reply to another comment.
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)


commentSchema.plugin(mongooseAggregatePaginate)

commentSchema.index({ video: 1, replyTo: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema)