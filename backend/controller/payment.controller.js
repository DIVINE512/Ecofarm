import dotenv from "dotenv";
import  Coupon from "../models/coupon.model.js";
import order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js"; // Ensure this is correctly set up
dotenv.config();

export const createCheckoutSession = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid products" });
        }

        let totalAmount = 0;

        const lineItems = products.map((product) => {
            const amount = Math.round(product.price * 100); // Convert to cents
            totalAmount += amount;
            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: amount,
                },
                quantity: product.quantity || 1,
            };
        });

        // Handle Coupon Discount
        let stripeCouponId = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if (coupon) {
                const discountAmount = Math.round(totalAmount * (coupon.discountPercentage / 100));
                totalAmount -= discountAmount;
                stripeCouponId = await createStripeCoupon(coupon.discountPercentage);
            }
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : [],
            metadata: {
                userId: req.user._id,
                couponCode: couponCode || "",
                products: JSON.stringify(
                    products.map((p) => ({
                        id:p_id,
                        price: p.price,
                        quantity: p.quantity,
                    }))
                ),
            },
        });

        // Create a new coupon for the user if they spend 20,000 INR or more
        if (totalAmount / 100 >= 20000) {
            await createNewCoupon(req.user._id);
        }

        res.status(200).json({ sessionId: session.id, totalAmount: totalAmount / 100 });
    } catch (error) {
        console.error("Error while creating checkout session:", error.message);
        res.status(500).json({ message: "Error in server", error: error.message });
    }
};

async function createStripeCoupon(discountPercentage) {
    const coupon = await stripe.coupons.create({
        percent_off: discountPercentage,
        duration: "once",
    });
    return coupon.id;
}

async function createNewCoupon(userId) {
    const newCoupon = new Coupon({
        code: "GIFT" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        userId: userId,
    });

    await newCoupon.save();
    return newCoupon;
}


export const checkoutSuccess =async (req,res)=>{
    try {
        const {sessionId} = req.body;   
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if(session.payment_status === "paid"){  
            if(session.metadata.couponCode){
                await Coupon.findOneAndUpdate({code : session.metadata.couponCode , userId :session.metadata.userId},{isActive : false}); 
                const couponCode = session.metadata.couponCode;
            }}
            //create a new order 
           const products = JSON.parse(session.metadata.products);
           const newOrder = new Order({
            userId :session.metadata.userId ,
            products :products.map(product =>({product :product.id , quantity :product.quantity,price :product.price})),
            totalAmount :session.metadata.totalAmount /100 ,
            stripeSessionId :sessionId
        });

        await newOrder.save();
        res.json(200)({
            success: true,
            message: "Order created successfully",  
            orderId: newOrder._id,
        })
    } catch (error) {
      console.log("error while checkout success", error.message);
      res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

