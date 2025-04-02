import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	getMyCoupon: async () => {
		try {
			const response = await axiosInstance.get("/coupons");
	
	
			if (Array.isArray(response.data) && response.data.length > 0) {
				set({ coupon: response.data[0] }); // Store the first coupon
			} else {
				console.warn("No valid coupons found in the response");
				set({ coupon: null });
			}
		} catch (error) {
			console.error("Error fetching coupon:", error.response?.data || error);
			toast.error("Failed to fetch coupon");
		}
	},
	
	

	applyCoupon: async (code) => {
		try {
			const response = await axiosInstance.post("/coupons/validate", { code });
	
			if (response.data && response.data.discountPercentage !== undefined) {
				set({ coupon: response.data, isCouponApplied: true });
				get().calculateTotals();
				toast.success("Coupon applied successfully");
			} else {
				toast.error("Invalid coupon response from server");
			}
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},
	

	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axiosInstance.get("/cart");

			set({ cart: res.data });

			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},

	addToCart: async (product) => {
		try {
	
			await axiosInstance.post("/cart", { productId: product._id });
	
			toast.success("Product added to cart");
	
			set((prevState) => {
	
				const cart = Array.isArray(prevState.cart) ? prevState.cart : [];
	
				const existingItem = cart.find((item) => item.product._id === product._id);
	
				const newCart = existingItem
					? cart.map((item) =>
						  item.product._id === product._id
							  ? { ...item, quantity: item.quantity + 1 }
							  : item
					  )
					: [...cart, { product, quantity: 1 }];
	
	
				return { cart: newCart };
			});
	
			get().calculateTotals();
		} catch (error) {
			console.error("Error adding product to cart:", error);
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},
	
	
	

	removeFromCart: async (productId) => {
		await axiosInstance.delete(`/cart`, { data: { productId } });
		set((prevState) => ({ cart: prevState.cart.filter((item) => item.product._id !== productId) }));
		get().calculateTotals();
	},

	updateQuantity: async (productId, quantity) => {
		try {
	
			const existingItem = get().cart.find((item) => item.product._id === productId);
			if (!existingItem) {
				return;
			}
	
			if (quantity === 0) {
				await get().removeFromCart(productId);
				return;
			}
	
			if (existingItem.quantity === quantity) return;
	
			const response = await axiosInstance.put(`/cart/${productId}`, { quantity });
	
			set((prevState) => ({
				cart: prevState.cart.map((item) =>
					item.product._id === productId ? { ...item, quantity } : item
				),
			}));
			
			get().calculateTotals();
			const { total, subtotal } = get();

			
			toast.success("Quantity updated successfully!");
		} catch (error) {
			console.error("Error updating quantity:", error);
		}
	},
	
	calculateTotals: () => {
		const { cart, coupon } = get();
		
		const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
		let total = subtotal;
	
		if (coupon && coupon.discountPercentage) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}
	
		set({ subtotal, total });
	},
	
	
}));

