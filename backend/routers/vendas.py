import calendar
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/vendas", tags=["vendas"])


def _calc_vencimento(mes_referencia: str, prazo_meses: int) -> date:
    year, month = int(mes_referencia[:4]), int(mes_referencia[5:7])
    month += prazo_meses
    year += (month - 1) // 12
    month = (month - 1) % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, last_day)


def _load_venda(db: Session, venda_id: int) -> models.Venda:
    return (
        db.query(models.Venda)
        .options(
            joinedload(models.Venda.cliente),
            joinedload(models.Venda.tipo_cesta),
            joinedload(models.Venda.pagamentos),
        )
        .filter(models.Venda.id == venda_id)
        .first()
    )


@router.get("", response_model=list[schemas.VendaResponse])
def listar_vendas(
    mes_referencia: Optional[str] = None,
    cliente_id: Optional[int] = None,
    status_entrega: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Venda).options(
        joinedload(models.Venda.cliente),
        joinedload(models.Venda.tipo_cesta),
        joinedload(models.Venda.pagamentos),
    )
    if mes_referencia:
        q = q.filter(models.Venda.mes_referencia == mes_referencia)
    if cliente_id:
        q = q.filter(models.Venda.cliente_id == cliente_id)
    if status_entrega:
        q = q.filter(models.Venda.status_entrega == status_entrega)
    return q.order_by(models.Venda.data_venda.desc(), models.Venda.id.desc()).all()


@router.post("", response_model=schemas.VendaResponse, status_code=201)
def criar_venda(payload: schemas.VendaCreate, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == payload.cliente_id).first()
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")

    tipo = db.query(models.TipoCesta).filter(models.TipoCesta.id == payload.tipo_cesta_id).first()
    if not tipo:
        raise HTTPException(404, "Tipo de cesta não encontrado")

    venda = models.Venda(
        cliente_id=payload.cliente_id,
        tipo_cesta_id=payload.tipo_cesta_id,
        mes_referencia=payload.mes_referencia,
        quantidade=payload.quantidade,
        forma_pagamento=payload.forma_pagamento,
        status_entrega="pendente",
        data_venda=date.today(),
    )
    db.add(venda)
    db.flush()

    valor_esperado = round(tipo.preco_venda * payload.quantidade, 2)

    if payload.forma_pagamento == "vista":
        pagamento = models.Pagamento(
            venda_id=venda.id,
            cliente_id=payload.cliente_id,
            valor_esperado=valor_esperado,
            valor_pago=valor_esperado,
            data_pagamento=date.today(),
            status="pago",
        )
    else:
        config = (
            db.query(models.Configuracao)
            .filter(models.Configuracao.chave == "prazo_pagamento_meses")
            .first()
        )
        prazo = int(config.valor) if config else 2
        vencimento = _calc_vencimento(payload.mes_referencia, prazo)
        pagamento = models.Pagamento(
            venda_id=venda.id,
            cliente_id=payload.cliente_id,
            valor_esperado=valor_esperado,
            status="pendente",
            data_vencimento=vencimento,
        )

    db.add(pagamento)
    db.commit()
    return _load_venda(db, venda.id)


@router.patch("/{venda_id}/entrega", response_model=schemas.VendaResponse)
def atualizar_entrega(
    venda_id: int, payload: schemas.VendaEntregaUpdate, db: Session = Depends(get_db)
):
    venda = db.query(models.Venda).filter(models.Venda.id == venda_id).first()
    if not venda:
        raise HTTPException(404, "Venda não encontrada")
    venda.status_entrega = payload.status_entrega
    db.commit()
    return _load_venda(db, venda_id)


@router.delete("/{venda_id}", status_code=204)
def deletar_venda(venda_id: int, db: Session = Depends(get_db)):
    venda = db.query(models.Venda).filter(models.Venda.id == venda_id).first()
    if not venda:
        raise HTTPException(404, "Venda não encontrada")
    db.delete(venda)
    db.commit()
