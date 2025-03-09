from fastapi import FastAPI
from app.routes import base_controller, agent_controller

app = FastAPI()

app.include_router(base_controller.router)
app.include_router(agent_controller.router)

