from fastapi import APIRouter

router = APIRouter(tags=["Base"], prefix="/agent")

@router.get("/")
def controllerCheck():
    return {"status": "ok"}