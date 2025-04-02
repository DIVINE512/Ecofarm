import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({}); // find all products
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getFeaturedProducts = async(req, res) => {
    try {
       let featuredProducts = await redis.get("featured_Products");
       if(featuredProducts){
        return res.json(JSON.parse(featuredProducts));
       }

       //if not in redis fetch it from mongoDB
       //lean() will return a plain javascript object instead of mongoodb documents
       featuredProducts = await Product.find({isFeatured : true}).lean();

       if(!featuredProducts){
        return res.status(404).json({message : "No featured products found"});
      } 

      // store it in redis for quick access
      await redis.set("featured_Products",JSON.stringify(featuredProducts));

      res.json(featuredProducts);

        }catch (error) {
        console.log("Error while getting featured products controller", error.message);
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

export const createProduct = async(req, res) => {
    try {
        const { name, price, description, category, image } = req.body;
        let cloudinaryResponse = null ;
        if(image){
            cloudinaryResponse = await cloudinary.uploader.upload(image, {resource_type : "image"});
        }

        const product = await Product.create({
            name,
            price,
            description,
            category,
            image : cloudinaryResponse?.secure_url ? cloudinaryResponse?.secure_url : ""
        });
       res.status(201).json(product);
    } catch (error) {
        clsonsole.log("Error while creating createProducts controller", error.message);
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

export const deleteProduct = async(req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if(!product){
            return res.status(404).json({message : "Product not found"});
        }

        if(product.image){
           const publicId = product.image.split("/").pop().split(".")[0]; 
           try {
            await cloudinary.uploader.destroy(publicId);
            console.log("Image deleted from cloudinary");
           } catch (error) {
            console.log("Error while deleting image from cloudinary", error.message);
           }
        }

        await redis.del("featured_Products");
        await product.findByIdAndDelete(req.params.id);
        res.json({message: "Product deleted successfully"}); 
    } catch (error) {
        console.log("error while deleteProduct controller ", error.message);
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

export const getRecommendedProducts = async(req, res) =>{
    try {
        const products = await Product.aggregate([
            {
                $sample : {
                    size : 4
                }
            },
            {
                $project : {
                    _id : 1,
                    name : 1,   
                    description : 1, 
                    category : 1,
                    image : 1,
                    price : 1
                }
        },
    ])
    res.json(products);
    } catch (error) {
        console.log({message : "Error while getting recommendedProducts controller", error : error.message});
    }
}

export const getAllProductsBycategory = async(req, res) => {
    const category = req.params.category;
    try {
        const products = await Product.find({category});
        res.json({products});
    } catch (error) {
        console.log({message : "Error while getting allProductsBycategory controller", error : error.message});
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
 }

export const toggelFeaturedProduct = async(req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if(product){
            product.isFeatured = !product.isFeatured;
            const updatedProduct = await product.save();
            await updateFeaturedProductsCache();
            res.json(updatedProduct);
          
        }else {
            res.status(404).json({message : "Product not found"});
        }
      
    } catch (error) {
        console.log({message: "Error while toggling featuredProduct controller", error : error.message});
        res.status(500).json({ message : "error in server" ,error : error.message });
    }
}

async function updateFeaturedProductsCache() {
    try {
        const products = await Product.find({}).lean();
        await redis.set("featured_Products",JSON.stringify(products));
    } catch (error) {
        console.log({message : "Error while updating featuredProducts cache controller", error : error.message});
    }
}

