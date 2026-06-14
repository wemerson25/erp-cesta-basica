from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/pagamentos", tags=["pagamentos"])


def _load_pagamento(db: Session, pgt_id: int) -> models.Pagamento:
    return (
        db.query(models.Pagamento)
        .options(
            joinedload(models.Pagamento.cliente),
            joinedload(models.Pagamento.venda).joinedload(models.Venda.tipo_cesta),
        )
        .filter(models.Pagamento.id == pgt_id)
        .first()
    )


def _atualizar_status_cliente(db: Session, cliente_id: int):
    tem_atrasado = (
        db.query(models.Pagamento)
        .filter(models.Pagamento.cliente_id == cliente_id, models.Pagamento.status == "atrasado")
        .first()
    )
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        return
    if tem_atrasado and cliente.status != "inadimplente":
        cliente.status = "inadimplente"
        db.commit()
    elif not tem_atrasado and cliente.status == "inadimplente":
        cliente.status = "ativo"
        db.commit()


@router.get("", response_model=list[schemas.PagamentoDetalheResponse])
def listar_pagamentos(
    status: Optional[str] = None,
    cliente_id: Optional[int] = None,
    mes_referencia: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Pagamento).options(
        joinedload(models.Pagamento.cliente),
        joinedload(models.Pagamento.venda).joinedload(models.Venda.tipo_cesta),
    )
    if status:
        q = q.filter(models.Pagamento.status == status)
    if cliente_id:
        q = q.filter(models.Pagamento.cliente_id == cliente_id)
    if mes_referencia:
        sub = (
            db.query(models.Venda.id)
            .filter(models.Venda.mes_referencia == mes_referencia)
            .subquery()
        )
        q = q.filter(models.Pagamento.venda_id.in_(sub))
    return q.order_by(models.Pagamento.data_vencimento.asc(), models.Pagamento.id.asc()).all()


@router.patch("/{pgt_id}/receber", response_model=schemas.PagamentoDetalheResponse)
def receber_pagamento(
    pgt_id: int, payload: schemas.ReceberPagamentoInput, db: Session = Depends(get_db)
):
    pgt = db.query(models.Pagamento).filter(models.Pagamento.id == pgt_id).first()
    if not pgt:
        raise HTTPException(404, "Pagamento não encontrado")
    if pgt.status == "pago":
        raise HTTPException(400, "Pagamento já registrado como pago")
    pgt.valor_pago = payload.valor_pago
    pgt.data_pagamento = payload.data_pagamento or date.today()
    pgt.status = "pago"
    db.commit()
    _atualizar_status_cliente(db, pgt.cliente_id)
    return _load_pagamento(db, pgt_id)


@router.post("/verificar-vencidos")
def verificar_vencidos(db: Session = Depends(get_db)):
    config = (
        db.query(models.Configuracao)
        .filter(models.Configuracao.chave == "dias_inadimplencia")
        .first()
    )
    dias = int(config.valor) if config else 30
    hoje = date.today()

    pendentes = (
        db.query(models.Pagamento)
        .filter(
            models.Pagamento.status == "pendente",
            models.Pagamento.data_vencimento != None,
        )
        .all()
    )

    atualizados = 0
    clientes_afetados = set()
    for p in pendentes:
        if p.data_vencimento and (hoje - p.data_vencimento).days > dias:
            p.status = "atrasado"
            atualizados += 1
            clientes_afetados.add(p.cliente_id)

    if atualizados:
        db.commit()
        for cid in clientes_afetados:
            _atualizar_status_cliente(db, cid)

    return {"atualizados": atualizados, "clientes_afetados": len(clientes_afetados)}
