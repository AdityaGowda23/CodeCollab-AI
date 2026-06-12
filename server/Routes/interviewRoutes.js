import { Router } from "express";
import InterviewSpace from "../Schemas/InterviewSpaceModel.js"; // adjust path as needed
import { randomUUID } from "crypto";

const interviewRoutes = Router();

interviewRoutes.post("/interview-create", async (req, res) => {
  try {
    const payload = req.body;

    // Basic validation
    const required = ["ownerId", "title", "scheduledAt", "candidateEmail"];
    const missing = required.filter((k) => !payload?.[k]);
    if (missing.length) {
      return res.status(400).json({ error: "Missing required fields", missing });
    }

    // Generate room ids if not provided
    const videoRoomId = payload.videoRoomId || `video_${randomUUID()}`;
    const codeRoomId = payload.codeRoomId || `code_${randomUUID()}`;
    const whiteBoardRoom = payload.whiteBoardRoom || `wb_${randomUUID()}`;

    // Normalize scheduledAt to Date
    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;

    // Build document according to schema
    const doc = {
      ownerId: payload.ownerId,
      title: payload.title,
      scheduledAt,
      candidateEmail: payload.candidateEmail,
      invitedInterviewers: Array.isArray(payload.invitedInterviewers) ? payload.invitedInterviewers : [],
      dsaQuestions: Array.isArray(payload.dsaQuestions) ? payload.dsaQuestions : [],
      videoRoomId,
      codeRoomId,
      whiteBoardRoom,
    };

    // Only set candidateId when known (candidate may not have signed up yet)
    if (payload.candidateId) {
      doc.candidateId = payload.candidateId;
    }

    const created = await InterviewSpace.create(doc);

    return res.status(201).json({ success: true, interviewSpace: created });
  } catch (err) {
    console.error("Create interview space error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default interviewRoutes;
