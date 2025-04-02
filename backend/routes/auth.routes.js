import express from "express";
import {signup , login , logout , refreshToken, getProfile} from "../controller/auth.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/login", login);
router.post("/signup", signup);
router.post("/logout",logout);
router.post("/refreshToken", refreshToken);
router.get("/profile",protectRoute, getProfile);

export default router;