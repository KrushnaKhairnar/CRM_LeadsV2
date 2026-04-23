from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.services.access import ensure_can_view
from app.services.leads_service import LeadsService
from app.services.followups_service import FollowupsService

from app.models.products import (
    ProductCreate,
    ProductUpdate,
    ProductOut
)
from app.models.followups import FollowupCreate

router = APIRouter()


# ----------------------------
# 🔧 Helper
# ----------------------------
def clean_mongo(doc):
    if doc:
        doc.pop("_id", None)
    return doc


# ----------------------------
# ✅ Create Product
# ----------------------------
@router.post("", response_model=ProductOut)
async def create_product(product: ProductCreate, db=Depends(get_db)):
    product_dict = product.model_dump()
    product_dict["project_id"] = str(uuid4())
    product_dict["_id"] = product_dict["project_id"]

    await db["products"].insert_one(product_dict)

    return clean_mongo(product_dict)   


# ----------------------------
# ✅ Get All Products
# ----------------------------
@router.get("", response_model=List[ProductOut])
async def get_products(db=Depends(get_db)):
    products = []
    async for product in db["products"].find():
        products.append(clean_mongo(product))
    return products


# ----------------------------
# ✅ Get Single Product
# ----------------------------
@router.get("/{project_id}", response_model=ProductOut)
async def get_product(project_id: str, db=Depends(get_db)):
    product = await db["products"].find_one({"project_id": project_id})

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return clean_mongo(product)


# ----------------------------
# ✅ Update Product (PATCH)
# ----------------------------

@router.patch("/{project_id}", response_model=ProductOut)
async def update_product(project_id: str, product: ProductUpdate, db=Depends(get_db)):
    update_data = product.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    result = await db["products"].update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated_product = await db["products"].find_one({"project_id": project_id})
    return clean_mongo(updated_product)


# ----------------------------
# ✅ Delete Product (POST)
# ----------------------------
@router.post("/{project_id}/delete")
async def delete_product(project_id: str, db=Depends(get_db)):
    result = await db["products"].delete_one({"project_id": project_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}


# # ----------------------------
# # ✅ Add Followup to Product
# # ----------------------------
# @router.post(
#     "/leads/{lead_id}/products/{product_id}/followups",
#     response_model=dict
# )
# async def add_product_followup(
#     lead_id: str,
#     product_id: str,
#     payload: FollowupCreate,
#     db=Depends(get_db),
#     user=Depends(get_current_user)
# ):
#     # Check lead
#     lead = await db["leads"].find_one({"lead_id": lead_id})
#     if not lead:
#         raise HTTPException(status_code=404, detail="Lead not found")

#     ensure_can_view(user, lead)

#     # Check product under lead
#     svc = LeadsService(db)
#     product = await svc.get_product(lead_id, product_id)
#     if not product:
#         raise HTTPException(status_code=404, detail="Product not found")

#     # Create followup
#     followup_payload = payload.model_dump()
#     followup_payload["product_id"] = product_id

#     fsvc = FollowupsService(db)
#     f = await fsvc.add_followup(lead_id, followup_payload, user)

#     return {
#         "followup": clean_mongo(f),
#         "badge": "Followup Updated"
#     }