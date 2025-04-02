import express from 'express' ;
import { protectRoute , adminRoute } from "../middleware/auth.middleware.js";
import {getAllProducts , getFeaturedProducts, deleteProduct, createProduct, getRecommendedProducts , getAllProductsBycategory ,toggelFeaturedProduct} from "../controller/product.controller.js"
const router = express.Router();
 
router.get("/",protectRoute, adminRoute, getAllProducts); 
router.get("/featured", getFeaturedProducts);
router.get("/recommendations" , getRecommendedProducts);  
router.get("/category/:category" , getAllProductsBycategory);  
router.post("/", protectRoute, adminRoute, createProduct);    
router.patch("/:id", protectRoute, adminRoute, toggelFeaturedProduct);    
router.delete("/:id", protectRoute, adminRoute, deleteProduct);  
 
export default router ;   