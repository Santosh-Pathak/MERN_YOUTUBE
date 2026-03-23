import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok" },
    message: "Healthcheck passed",
  });
});

export default router;

