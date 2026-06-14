"""Shared helpers for stock and cost recalculation."""
from sqlalchemy.orm import Session, joinedload
import models


def recalcular_saldo(db: Session, item_id: int, mes_referencia: str):
    saldo = (
        db.query(models.SaldoMensalEstoque)
        .filter_by(item_id=item_id, mes_referencia=mes_referencia)
        .first()
    )
    if not saldo:
        saldo = models.SaldoMensalEstoque(
            item_id=item_id,
            mes_referencia=mes_referencia,
            quantidade_inicial=0,
            valor_inicial=0,
            quantidade_comprada_mes=0,
            valor_comprado_mes=0,
            custo_medio_mes=0,
            quantidade_consumida_mes=0,
            quantidade_final=0,
            valor_final=0,
        )
        db.add(saldo)

    compras = (
        db.query(models.Compra)
        .filter_by(item_id=item_id, mes_referencia=mes_referencia)
        .all()
    )
    saldo.quantidade_comprada_mes = sum(c.quantidade_comprada for c in compras)
    saldo.valor_comprado_mes = round(sum(c.valor_total for c in compras), 4)

    total_qty = saldo.quantidade_inicial + saldo.quantidade_comprada_mes
    total_val = saldo.valor_inicial + saldo.valor_comprado_mes
    saldo.custo_medio_mes = round(total_val / total_qty, 6) if total_qty > 0 else 0
    saldo.quantidade_final = max(0.0, total_qty - saldo.quantidade_consumida_mes)
    saldo.valor_final = round(saldo.quantidade_final * saldo.custo_medio_mes, 4)
    db.flush()


def recalcular_custo_cesta(db: Session, tipo_cesta_id: int, mes_referencia: str):
    tipo = (
        db.query(models.TipoCesta)
        .options(joinedload(models.TipoCesta.composicoes))
        .filter_by(id=tipo_cesta_id)
        .first()
    )
    if not tipo:
        return
    custo_total = 0.0
    for comp in tipo.composicoes:
        saldo = (
            db.query(models.SaldoMensalEstoque)
            .filter_by(item_id=comp.item_id, mes_referencia=mes_referencia)
            .first()
        )
        custo_total += (saldo.custo_medio_mes if saldo else 0.0) * comp.quantidade

    registro = (
        db.query(models.CustoCestaMensal)
        .filter_by(tipo_cesta_id=tipo_cesta_id, mes_referencia=mes_referencia)
        .first()
    )
    if not registro:
        registro = models.CustoCestaMensal(
            tipo_cesta_id=tipo_cesta_id, mes_referencia=mes_referencia
        )
        db.add(registro)
    registro.custo_total_calculado = round(custo_total, 4)
    registro.margem_calculada = round(tipo.preco_venda - custo_total, 4)
    db.flush()


def recalcular_custo_cestas_por_item(db: Session, item_id: int, mes_referencia: str):
    tipo_ids = {
        c.tipo_cesta_id
        for c in db.query(models.ComposicaoCesta).filter_by(item_id=item_id).all()
    }
    for tid in tipo_ids:
        recalcular_custo_cesta(db, tid, mes_referencia)


def mes_anterior(mes: str) -> str:
    year, month = int(mes[:4]), int(mes[5:7])
    month -= 1
    if month == 0:
        month = 12
        year -= 1
    return f"{year:04d}-{month:02d}"
