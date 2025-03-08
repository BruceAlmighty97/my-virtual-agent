from fastapi import FastAPI
from app.routes import base_controller

app = FastAPI()

app.include_router(base_controller.router)
