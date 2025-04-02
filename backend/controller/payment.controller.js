import dotenv from "dotenv";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js"; 
import User from "../models/user.model.js"; 

dotenv.config();

export const createCheckoutSession = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid products" });
        }

        let totalAmount = 0;

        // ✅ Corrected product structure inside line_items
        const lineItems = products.map((item) => {
            if (!item.product || !item.product.price) {
                throw new Error("Invalid product data received");
            }

            const price = Number(item.product.price) || 0;
            const quantity = Number(item.quantity) || 1;
            const amount = Math.round(price * 100); // Convert price to cents

            totalAmount += amount * quantity; // ✅ Corrected total amount calculation

            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: item.product.name,
                        images: item.product.image ? [item.product.image] : [],
                    },
                    unit_amount: amount,
                },
                quantity: quantity,
            };
        });

        // ✅ Handle Coupon Discount
        let stripeCouponId = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if (coupon) {
                const discountAmount = Math.round(totalAmount * (coupon.discountPercentage / 100));
                totalAmount -= discountAmount;
                stripeCouponId = await createStripeCoupon(coupon.discountPercentage);
            }
        }

        // ✅ Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : [],
            metadata: {
                userId: req.user._id.toString(),  // Convert ObjectId to string
                couponCode: couponCode ? couponCode.toString() : "",
                totalAmount: totalAmount.toString(),  // Ensure totalAmount is a string
                products: JSON.stringify(
                    products.map((item) => ({
                        id: item.product._id.toString(),  // Convert ObjectId to string
                        price: item.product.price.toString(),
                        quantity: item.quantity.toString(),
                    }))
                ),
            },
            
        });

        // ✅ Create a new coupon for the user if they spend 20,000 INR or more
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
    const existingCoupon = await Coupon.findOne({ userId });

    if (existingCoupon) {
        console.log("Deleting old coupon:", existingCoupon.code);
        await Coupon.deleteOne({ userId }); 
    }

    const newCoupon = new Coupon({
        code: "GIFT" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        userId: userId,
    });

    await newCoupon.save();
    console.log("New coupon created:", newCoupon.code);
    return newCoupon;
}



export const checkoutSuccess = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === "paid") {
            // ✅ Check if order already exists
            const existingOrder = await Order.findOne({ stripeSessionId: sessionId });
            if (existingOrder) {
                return res.status(400).json({
                    success: false,
                    message: "Order already processed",
                });
            }

            // ✅ Deactivate coupon if used
            if (session.metadata.couponCode) {
                await Coupon.findOneAndUpdate(
                    { code: session.metadata.couponCode, userId: session.metadata.userId },
                    { isActive: false }
                );
            }

            // ✅ Parse products from metadata correctly
            const products = JSON.parse(session.metadata.products);

            // ✅ Create a new order
            const newOrder = new Order({
                user: session.metadata.userId,  
                products: products.map((product) => ({
                    product: product.id,
                    quantity: product.quantity,
                    price: product.price,
                })),
                totalAmount: Number(session.metadata.totalAmount) / 100,
                stripeSessionId: sessionId,
            });

            await newOrder.save();

            // ✅ Clear the user's cart in the database
            await User.findByIdAndUpdate(session.metadata.userId, { cartItems: [] });

            res.status(200).json({
                success: true,
                message: "Order created successfully, cart cleared",
                orderId: newOrder._id,
            });
        } else {
            res.status(400).json({ message: "Payment not completed" });
        }
    } catch (error) {
        console.error("Error while processing checkout success:", error.message);
        res.status(500).json({ message: "Error in server", error: error.message });
    }
};

