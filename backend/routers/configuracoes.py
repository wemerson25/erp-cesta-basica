from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/configuracoes", tags=["configuracoes"])


@router.get("", response_model=list[schemas.ConfiguracaoResponse])
def listar_configuracoes(db: Session = Depends(get_db)):
    return db.query(models.Configuracao).order_by(models.Configuracao.id).all()


@router.patch("/{chave}", response_model=schemas.ConfiguracaoResponse)
def atualizar_configuracao(
    chave: str, payload: schemas.ConfiguracaoUpdate, db: Session = Depends(get_db)
):
    config = db.query(models.Configuracao).filter(models.Configuracao.chave == chave).first()
    if not config:
        raise HTTPException(404, "Configuração não encontrada")
    config.valor = payload.valor
    db.commit()
    db.refresh(config)
    return config
