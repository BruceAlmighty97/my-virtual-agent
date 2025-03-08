from fastapi import APIRouter

router = APIRouter(tags=["Base"])

@router.get("/")
def healthcheck():
    return {"status": "ok"}

@router.get("/test")
def test():
    return {"online": True}