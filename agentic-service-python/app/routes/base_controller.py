from fastapi import APIRouter, FastAPI

class BaseController:
    _app: FastAPI = None
    _router: APIRouter = None

    def __init__(self, app: FastAPI):
        self._app = app
        self._router = APIRouter(tags=["Base"])
        self._router.add_api_route("/", self.healthcheck)
        self._router.add_api_route("/test", self.test)
        self._app.include_router(self._router)

    def healthcheck(self):
        return {"status": "ok"}
    
    def test(self):
        return {"online": True}