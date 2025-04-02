import Coupon from "../models/coupon.model.js";

export const getCoupon = async(req, res) => {
    try {
        const coupon = await Coupon.findOne({userId : req.user._id , isActive : true});
         res.json(coupon || null);
    } catch (error) {
        console.log({message : "Error while getting coupon controller", error : error.message});
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

export const validateCoupon = async(req, res) => {
    try {
        const {code} = req.body;
        const coupon = await Coupon.findOne({code : code ,userId: req.user._id , isActive : true});

        if( coupon){
            return res.status(404).json({message :"Coupan not found"}); 
        }
        if (coupon.expirationDate < Date.now()){
         coupon.isActive = false ;
            await coupon.save();
            return res.status(404).json({message :"Coupan expired"}); 
        }

        res.json({
            message : "Coupan is valid",
            code : coupon.code,
            discountPercentage : coupon.discountPercentage,

        });
    } catch (error) {
        console.log({message : "Error while validating coupon controller", error : error.message});
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}