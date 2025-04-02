import Coupon from "../models/coupon.model.js";
export const getCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find({ userId: req.user._id, isActive: true });

        

        if (!coupons.length) {
            return res.status(404).json({ message: "No active coupons found" });
        }

        res.json(coupons);
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



export const validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code, userId: req.user._id, isActive: true });

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });  // Fixed condition
        }

        if (coupon.expirationDate < Date.now()) {
            coupon.isActive = false;
            await coupon.save();
            return res.status(400).json({ message: "Coupon expired" });  // Changed status code
        }

        res.json({
            message: "Coupon is valid",
            code: coupon.code,
            discountPercentage: coupon.discountPercentage,
        });

    } catch (error) {
        console.error("Error while validating coupon:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
