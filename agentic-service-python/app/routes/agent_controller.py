from fastapi import APIRouter, FastAPI
from pydantic import BaseModel

class QueryRequest(BaseModel):
        session_id: str
        question: str

class AgentController:
    _app: FastAPI = None
    _router: APIRouter = None

    def __init__(self, app: FastAPI):
        self._app = app
        self._router = APIRouter(tags=["Agent"], prefix="/agent")
        self._router.add_api_route("/", self.routercheck)
        self._router.add_api_route("/query", self.queryAgent, methods=["POST"])
        self._app.include_router(self._router)

    def routercheck(self):
        return {"status": "ok"}
    
    def queryAgent(self, request: QueryRequest):
        session_id = request.session_id
        question = request.question
        # Process the session_id and question here
        return {"session_id": session_id, "question": question}