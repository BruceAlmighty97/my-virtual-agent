from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routes.base_controller import BaseController
from app.routes.agent_controller import AgentController
from app.services.document_service import DocumentService
from app.services.settings_service import SettingsService

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("starting up Agentic FastAPI")
    app.state.document_service = DocumentService()
    yield
    print("shutting down Agentic FastAPI")


app = FastAPI(lifespan=lifespan)

base_controller_instance = BaseController(app)
agent_controller_instance = AgentController(app)




