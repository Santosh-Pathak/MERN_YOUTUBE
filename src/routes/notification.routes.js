import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getMyNotifications);
router.route("/read-all").patch(markAllAsRead);
router.route("/:notificationId/read").patch(markAsRead);

export default router;

