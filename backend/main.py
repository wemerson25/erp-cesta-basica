import os
import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine
import models
from routers import clientes, itens, tipos_cesta, vendas, pagamentos


def _seed_configuracoes():
    from sqlalchemy.orm import Session
    from database import SessionLocal

    db: Session = SessionLocal()
    try:
        defaults = [
            ("prazo_pagamento_meses", "2", "Defasagem padrão de pagamento em meses"),
            ("dias_inadimplencia", "30", "Dias de atraso para marcar inadimplente automaticamente"),
            ("estoque_minimo_padrao", "5", "Estoque mínimo padrão para alertas"),
        ]
        for chave, valor, desc in defaults:
            if not db.query(models.Configuracao).filter(models.Configuracao.chave == chave).first():
                db.add(models.Configuracao(chave=chave, valor=valor, descricao=desc))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        models.Base.metadata.create_all(bind=engine)
        _seed_configuracoes()
    except Exception as e:
        print(f"[startup] DB init error: {e}")
    yield


app = FastAPI(title="ERP Cesta Básica", version="1.0.0", lifespan=lifespan)

# Em produção (Vercel), libera todas as origens pois frontend e API ficam no mesmo domínio
origins = ["*"] if os.getenv("VERCEL") else ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router)
app.include_router(itens.router)
app.include_router(tipos_cesta.router)
app.include_router(vendas.router)
app.include_router(pagamentos.router)

# Serve frontend static files (frontend/dist/ committed to repo)
_frontend = pathlib.Path(__file__).parent.parent / "frontend" / "dist"
if _frontend.exists():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"status": "ok", "app": "ERP Cesta Básica", "version": "1.0.0"}
