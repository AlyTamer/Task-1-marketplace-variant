import Joi from 'joi';
import { Listing } from '../models/Listing.js';

const createSchema = Joi.object({
  title: Joi.string().min(2).max(60).required(),
  description: Joi.string().min(2).max(500),
  price: Joi.number().min(0).required(),
  category: Joi.string()
    .valid("textbooks","electronics","furniture","clothing","other")
    .default("other"),
  condition: Joi.string()
    .valid("new","like-new","used","worn")
    .default("used"),
  status:Joi.string()
    .valid("active","sold","removed")
    .default("active"),
  seller:Joi.string(),
});

const updateSchema = Joi.object({
  title: Joi.string().min(2).max(60),
  description: Joi.string().min(2).max(500),
  price: Joi.number().min(0),
  category: Joi.string()
    .valid("textbooks","electronics","furniture","clothing","other"),
  condition: Joi.string()
    .valid("new","like-new","used","worn"),
  status:Joi.string()
    .valid("active","sold","removed"),
  seller:Joi.string(),
}).min(1);

const sellSchema = Joi.object({});

// GET /api/listings
export async function getAllListings(req, res, next) {
  try {
    const listings = await Listing.find(
      req.query.includeRemoved === "true" ? {} : { status: { $ne: "removed" } }
    )
      .sort({ createdAt: -1 })
      .lean().populate('seller','name email');
    res.json({listings:listings})
  } catch (err) { next(err); }
}

// GET /api/listings/:id
// TODO: implement per README.md sections 3 and 5.
export async function getListing(req, res, next) {
  try {

    const listing = await Listing.findById(req.params.id).populate('seller','name email');
    if(!listing) return res.status(404).json({message:"Listing not found"});
    if(listing.status==="removed") return res.status(400).json({message:"Listing already marked as deleted"});
    res.json({listing:listing});
  } catch (err) { next(err); }
}

// POST /api/listings
// TODO: implement per README.md section 3.
export async function createListing(req, res, next) {
  try {

    const {value,error} = createSchema.validate(req.body);
    if(error) return res.status(400).json({message:error.message});
    
    const existing=await Listing.findOne({title:value.title});
    if(existing) return res.status(409).json({message:"Listing already exists"});

    const listing = await Listing.create(value);
    res.status(201).json({listing:listing});

  } catch (err) { next(err); }
}

// PATCH /api/listings/:id
// TODO: implement per README.md sections 3 and 5.
export async function updateListing(req, res, next) {
  try {

    const {value,error} = updateSchema.validate(req.body,{abortEarly:false,stripUnknown:true});
    if (error) return res.status(400).json({message:error.message});

    const doc = await Listing.findByIdAndUpdate(req.params.id,{$set:value},{new:true,runValidators:true});
    if(!doc) return res.status(404).json({message:"Listing not found"});
    res.json({listing:doc});
  } catch (err) { next(err); }
}

// DELETE /api/listings/:id
// TODO: implement per README.md sections 4 and 5.
export async function deleteListing(req, res, next) {
  try {
     const doc = await Listing.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Listing not found" });
    }
    if (doc.status === "removed") {
      return res.status(400).json({
        message: "Listing already marked as deleted",
      });
    }
    doc.status = "removed";
    await doc.save();
    res.json({ listing: doc });
  } catch (err) { next(err); }
}

export async function sellListing(req,res,next){
  try{
    const {error} = sellSchema.validate(req.body || {});
    if(error) return res.status(400).json({message:error.message});

    const doc = await Listing.findById(req.params.id);
    if(!doc) return res.status(404).json({message:"Listing not found"});
    if(doc.status==="removed") return res.status(400).json({message:"Listing already marked as deleted"});
    doc.status="sold";
    await doc.save();
    res.json({listing:doc});
  }
  catch(err){next(err);}
}
