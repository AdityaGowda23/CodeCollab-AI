
import mongoose from "mongoose";

const { Schema } = mongoose;

const DSASubmissionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },

    testCases: [
      {
        input: { type: String },
      }
    ],
    externalId: { type: String },
  },
  { _id: false }
);

const InterviewSpaceSchema = new Schema(
  {
    
    // Firebase UID strings — must match UserModel._id (String), not ObjectId
    ownerId: { type: String, ref: "User", required: true, index: true },

    invitedInterviewers: [
      {
        userId: { type: String, ref: "User" },
        email: { type: String },
      },
    ],


    dsaQuestions: [DSASubmissionSchema],

    title: { type: String, default: "Interview Session" },
    scheduledAt: { type: Date },



    // Optional until the candidate signs up; candidateEmail identifies them for now
    candidateId: { type: String, ref: "User", index: true },
    candidateEmail: { type: String },




    videoRoomId: { type: String },
    codeRoomId: { type: String },
    whiteBoardRoom: { type: String },


  },
  { timestamps: true }
);



const InterviewSpace = mongoose.models.InterviewSpace || mongoose.model("InterviewSpace", InterviewSpaceSchema);
export default InterviewSpace;
