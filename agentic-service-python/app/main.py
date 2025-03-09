from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routes import agent_controller
from app.routes.base_controller import BaseController
from app.services.document_service import DocumentService
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LANGSMITH_API_KEY: str = "abcd"
    GROQ_API_KEY: str = "abcd"
    MY_VIRTUAL_AGENT_API_KEY: str = "abcd"

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("starting up Agentic FastAPI")
    print(settings.LANGSMITH_API_KEY)
    app.state.test_variable = "test"
    app.state.document_service = DocumentService()
    yield
    print("shutting down Agentic FastAPI")


app = FastAPI(lifespan=lifespan)

base_controller_instance = BaseController(app)


app.include_router(agent_controller.router)

