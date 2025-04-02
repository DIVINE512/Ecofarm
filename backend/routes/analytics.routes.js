import express from "express";
import {adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAnalyticsData, getDailySalesData } from "../controller/analytics.controller.js";


const router = express.Router();

router.get("/",protectRoute, adminRoute, async (req, res) => {
    try {
        const analyticsData = await getAnalyticsData();
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        dailySalesData = await getDailySalesData(startDate, endDate);

        res.json({ analyticsData, dailySalesData });

    } catch (error) {
       console.log({message : "Error while getting analytics data", error : error.message});
        res.status(500).json({ message : "error in server" ,error : error.message }); 
    }
});

export default router;