from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
from routers.estoque_utils import recalcular_saldo, recalcular_custo_cestas_por_item

router = APIRouter(prefix="/api/compras", tags=["compras"])


@router.get("", response_model=list[schemas.CompraResponse])
def listar_compras(
    mes_referencia: Optional[str] = None,
    item_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Compra).options(joinedload(models.Compra.item))
    if mes_referencia:
        q = q.filter(models.Compra.mes_referencia == mes_referencia)
    if item_id:
        q = q.filter(models.Compra.item_id == item_id)
    return q.order_by(models.Compra.data_compra.desc(), models.Compra.id.desc()).all()


@router.post("", response_model=schemas.CompraResponse, status_code=201)
def criar_compra(payload: schemas.CompraCreate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")

    valor_total = round(payload.quantidade_comprada * payload.valor_unitario, 2)
    compra = models.Compra(
        item_id=payload.item_id,
        mes_referencia=payload.mes_referencia,
        quantidade_comprada=payload.quantidade_comprada,
        valor_unitario=payload.valor_unitario,
        valor_total=valor_total,
        data_compra=payload.data_compra or date.today(),
        fornecedor=payload.fornecedor,
    )
    db.add(compra)
    db.flush()

    recalcular_saldo(db, payload.item_id, payload.mes_referencia)
    recalcular_custo_cestas_por_item(db, payload.item_id, payload.mes_referencia)
    db.commit()

    return (
        db.query(models.Compra)
        .options(joinedload(models.Compra.item))
        .filter(models.Compra.id == compra.id)
        .first()
    )


@router.delete("/{compra_id}", status_code=204)
def deletar_compra(compra_id: int, db: Session = Depends(get_db)):
    compra = db.query(models.Compra).filter(models.Compra.id == compra_id).first()
    if not compra:
        raise HTTPException(404, "Compra não encontrada")
    item_id = compra.item_id
    mes = compra.mes_referencia
    db.delete(compra)
    db.flush()
    recalcular_saldo(db, item_id, mes)
    recalcular_custo_cestas_por_item(db, item_id, mes)
    db.commit()
