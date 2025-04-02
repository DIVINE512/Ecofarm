import mongoose from "mongoose";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";



export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user; 

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid or missing product ID" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingItemIndex = user.cartItems.findIndex((item) =>
      item.product._id.equals(productId)
    );

    if (existingItemIndex !== -1) {
      user.cartItems[existingItemIndex].quantity += 1;
    } else {
      user.cartItems.push({ product: product, productId: productId, quantity: 1 });
    }

    await user.save();

    res.json({ success: true, cartItems: user.cartItems });

  } catch (error) {
    console.error("Error in addToCart controller:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





export const removeAllFromCart = async (req, res) => {
  try {
      const { productId } = req.body;
      const user = req.user;

      if (!user) {
          return res.status(401).json({ message: "User not found" });
      }

      if (!productId) {
          user.cartItems = []; // Clear the entire cart
      } else {
          user.cartItems = user.cartItems.filter(item => String(item.product) !== String(productId));
      }

      await user.save();
      res.json({ message: "Cart updated", cartItems: user.cartItems });
  } catch (error) {
      res.status(500).json({ message: "Error in server", error: error.message });
  }
};



export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params; // productId from URL
    let { quantity } = req.body;
    const user = req.user;

    quantity = Number(quantity); // Convert quantity to a number

    console.log("📌 Product ID from URL:", id);
    console.log("🔍 Checking if product exists in cart...");
    console.log("🛒 User's cart:", user.cartItems.map(item => item.product.toString())); // Convert all IDs to string for debugging

    // Convert productId to ObjectId for proper comparison
    const productId = new mongoose.Types.ObjectId(id);
    console.log(
      "🛒 Cart Items Before Update:",
      user.cartItems.map((item) => ({
        id: item.product.toString(),
        quantity: item.quantity,
      }))
    );
    console.log("🔍 Incoming Product ID:", productId.toString());
    const itemIndex = user.cartItems.findIndex(item => item.product.equals(productId));

    if (itemIndex === -1) {
      console.warn("❌ Product not found in cart:", productId);
      return res.status(404).json({ message: "Product not found in cart" });
    }

    if (quantity < 0) {
      console.warn("⚠️ Invalid quantity:", quantity);
      return res.status(400).json({ message: "Quantity cannot be negative" });
    }

    if (quantity === 0) {
      user.cartItems.splice(itemIndex, 1);
    } else {
      user.cartItems[itemIndex].quantity = quantity;
    }

    await user.save();
    console.log("✅ Cart updated successfully:", user.cartItems);
    res.json(user.cartItems);
  } catch (error) {
    console.error("❌ Error updating quantity:", error.message);
    res.status(500).json({ message: "Error in server", error: error.message });
  }
};



export const getCartProducts = async (req, res) => {
  try {
      const user = await User.findById(req.user._id)
          .populate("cartItems.product"); // Fetch full product details

      if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("📦 Fetched Cart Items with Products:", user.cartItems); // Debugging log

      res.json(user.cartItems || []); // Send populated cart items
  } catch (error) {
      console.error("❌ Error fetching cart items:", error);
      res.status(500).json({ message: "Failed to fetch cart items" });
  }
};

  
  