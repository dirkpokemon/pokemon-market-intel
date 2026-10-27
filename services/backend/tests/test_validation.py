"""
Dutch validation messages (no database needed).

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel, EmailStr, Field

from app.main import validation_exception_handler

app = FastAPI()
app.add_exception_handler(RequestValidationError, validation_exception_handler)


class Register(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


@app.post("/register")
def register(body: Register):
    return {"ok": True}


@app.get("/check")
def check(
    name: str = Query(..., min_length=1),
    price: float = Query(..., gt=0, lt=1_000_000),
    language: str = Query(default="EN", pattern="^(EN|JP)$"),
):
    return {"ok": True}


client = TestClient(app)


def msgs(response):
    assert response.status_code == 422
    return [e["msg"] for e in response.json()["detail"]]


def test_register_messages():
    r = client.post("/register", json={"email": "geen-mail", "password": "kort"})
    assert msgs(r) == [
        "Vul een geldig e-mailadres in.",
        "Wachtwoord moet minstens 8 tekens hebben.",
    ]


def test_missing_field():
    r = client.post("/register", json={"password": "langgenoeg"})
    assert msgs(r) == ["E-mailadres ontbreekt."]


def test_query_messages():
    r = client.get("/check", params={"name": "", "price": "abc", "language": "DE"})
    assert msgs(r) == [
        "Kaartnaam mag niet leeg zijn.",
        "Prijs moet een getal zijn.",
        "Taal heeft een ongeldige waarde.",
    ]


def test_number_bounds_use_dutch_formatting():
    assert msgs(client.get("/check", params={"name": "x", "price": 2_000_000})) == [
        "Prijs moet kleiner zijn dan 1.000.000."
    ]
    assert msgs(client.get("/check", params={"name": "x", "price": 0})) == [
        "Prijs moet groter zijn dan 0."
    ]


def test_invalid_json():
    r = client.post("/register", content="{niet json", headers={"content-type": "application/json"})
    assert msgs(r) == ["Het verzoek kon niet worden gelezen."]


def test_response_shape_kept():
    detail = client.post("/register", json={}).json()["detail"]
    assert set(detail[0]) == {"loc", "msg", "type"}
    assert detail[0]["loc"] == ["body", "email"]
