from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.services.access import ensure_can_view
from app.services.leads_service import LeadsService
from app.services.followups_service import FollowupsService
from app.core.deps import get_current_user

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
# def clean_mongo(doc):
#     if doc:
#         doc.pop("_id", None)
#     return doc
def clean_mongo(doc):
    if doc:
        doc["project_id"] = str(doc["_id"])  # ← capture _id as project_id first
        doc.pop("_id", None)
    return doc

# ----------------------------
# ✅ Create Product
# ----------------------------
 
@router.post("", response_model=ProductOut)
async def create_product(
    product: ProductCreate, 
    db=Depends(get_db),
    user=Depends(get_current_user)  # 👈 Add this
):
    product_dict = product.model_dump()
    product_dict["project_id"] = str(uuid4())
    product_dict["_id"] = product_dict["project_id"]
    product_dict["created_by"] = user["user_id"]  # 👈 And this

    await db["products"].insert_one(product_dict)
    return clean_mongo(product_dict)


# ----------------------------
# ✅ Get All Products
# ----------------------------

@router.get("", response_model=List[ProductOut])
async def get_products(
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    if user["role"] == "ADMIN":
        query = {}

    elif user["role"] == "MANAGER":
        query = {"created_by": user["user_id"]}

    elif user["role"] == "SALES":
        sales_user = await db["users"].find_one({"user_id": user["user_id"]})

        if not sales_user:
            return []

        manager_id = sales_user.get("created_by")

        if not manager_id:
            return []

        query = {"created_by": manager_id}

    else:
        return []

    products = []
    async for product in db["products"].find(query):
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


