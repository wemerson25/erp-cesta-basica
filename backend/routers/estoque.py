from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
from routers.estoque_utils import (
    recalcular_saldo,
    recalcular_custo_cesta,
    mes_anterior,
)

router = APIRouter(tags=["estoque"])


# ── Saldo Mensal ──────────────────────────────────────────────────────────────

@router.get("/api/estoque", response_model=list[schemas.SaldoMensalResponse])
def listar_saldo(mes_referencia: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.SaldoMensalEstoque).options(
        joinedload(models.SaldoMensalEstoque.item)
    )
    if mes_referencia:
        q = q.filter(models.SaldoMensalEstoque.mes_referencia == mes_referencia)
    return q.order_by(models.SaldoMensalEstoque.item_id).all()


@router.post("/api/estoque/iniciar-mes")
def iniciar_mes(payload: schemas.MesInput, db: Session = Depends(get_db)):
    mes_novo = payload.mes_referencia
    mes_ant = mes_anterior(mes_novo)

    saldos_ant = (
        db.query(models.SaldoMensalEstoque)
        .filter_by(mes_referencia=mes_ant)
        .all()
    )
    iniciados = 0
    for s in saldos_ant:
        existe = (
            db.query(models.SaldoMensalEstoque)
            .filter_by(item_id=s.item_id, mes_referencia=mes_novo)
            .first()
        )
        if not existe:
            db.add(models.SaldoMensalEstoque(
                item_id=s.item_id,
                mes_referencia=mes_novo,
                quantidade_inicial=s.quantidade_final,
                valor_inicial=s.valor_final,
                custo_medio_mes=s.custo_medio_mes,
                quantidade_comprada_mes=0,
                valor_comprado_mes=0,
                quantidade_consumida_mes=0,
                quantidade_final=s.quantidade_final,
                valor_final=s.valor_final,
            ))
            iniciados += 1
    db.commit()
    return {"iniciados": iniciados, "mes_referencia": mes_novo, "mes_anterior": mes_ant}


@router.post("/api/estoque/calcular-consumo")
def calcular_consumo(payload: schemas.MesInput, db: Session = Depends(get_db)):
    mes = payload.mes_referencia

    vendas = (
        db.query(models.Venda)
        .options(
            joinedload(models.Venda.tipo_cesta).joinedload(models.TipoCesta.composicoes)
        )
        .filter(models.Venda.mes_referencia == mes)
        .all()
    )

    consumo: dict = {}
    for venda in vendas:
        for comp in venda.tipo_cesta.composicoes:
            consumo[comp.item_id] = consumo.get(comp.item_id, 0.0) + (
                comp.quantidade * venda.quantidade
            )

    for item_id, qtd in consumo.items():
        saldo = (
            db.query(models.SaldoMensalEstoque)
            .filter_by(item_id=item_id, mes_referencia=mes)
            .first()
        )
        if not saldo:
            saldo = models.SaldoMensalEstoque(
                item_id=item_id, mes_referencia=mes,
                quantidade_inicial=0, valor_inicial=0,
                quantidade_comprada_mes=0, valor_comprado_mes=0,
                custo_medio_mes=0,
            )
            db.add(saldo)
        saldo.quantidade_consumida_mes = round(qtd, 4)
        total_qty = saldo.quantidade_inicial + saldo.quantidade_comprada_mes
        saldo.quantidade_final = max(0.0, total_qty - saldo.quantidade_consumida_mes)
        saldo.valor_final = round(saldo.quantidade_final * saldo.custo_medio_mes, 4)

    db.commit()
    return {"itens_atualizados": len(consumo)}


# ── Custo das Cestas ──────────────────────────────────────────────────────────

@router.get("/api/custo-cesta", response_model=list[schemas.CustoCestaMensalResponse])
def listar_custo_cesta(mes_referencia: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.CustoCestaMensal).options(
        joinedload(models.CustoCestaMensal.tipo_cesta)
    )
    if mes_referencia:
        q = q.filter(models.CustoCestaMensal.mes_referencia == mes_referencia)
    return q.order_by(models.CustoCestaMensal.tipo_cesta_id).all()


@router.post("/api/custo-cesta/recalcular")
def recalcular_todos_custos(payload: schemas.MesInput, db: Session = Depends(get_db)):
    tipos = db.query(models.TipoCesta).all()
    for tipo in tipos:
        recalcular_custo_cesta(db, tipo.id, payload.mes_referencia)
    db.commit()
    return {"recalculados": len(tipos), "mes_referencia": payload.mes_referencia}
