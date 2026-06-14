from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models

router = APIRouter(prefix="/api/relatorios", tags=["relatorios"])


def _pagamentos_de_vendas(vendas):
    return [p for v in vendas for p in v.pagamentos]


def _sumarizar_mes(mes, vendas):
    total_cestas = sum(v.quantidade for v in vendas)
    valor_total = round(sum(v.tipo_cesta.preco_venda * v.quantidade for v in vendas), 2)
    pgts = _pagamentos_de_vendas(vendas)
    return {
        "mes_referencia": mes,
        "total_vendas": len(vendas),
        "total_cestas": total_cestas,
        "valor_total": valor_total,
        "valor_recebido": round(sum(p.valor_pago or 0 for p in pgts if p.status == "pago"), 2),
        "valor_pendente": round(sum(p.valor_esperado for p in pgts if p.status == "pendente"), 2),
        "valor_atrasado": round(sum(p.valor_esperado for p in pgts if p.status == "atrasado"), 2),
    }


def _vendas_com_rel(db, mes=None):
    q = db.query(models.Venda).options(
        joinedload(models.Venda.tipo_cesta),
        joinedload(models.Venda.pagamentos),
        joinedload(models.Venda.cliente),
    )
    if mes:
        q = q.filter(models.Venda.mes_referencia == mes)
    return q.all()


@router.get("/resumo")
def resumo_mensal(mes_referencia: str, db: Session = Depends(get_db)):
    vendas = _vendas_com_rel(db, mes_referencia)
    sumario = _sumarizar_mes(mes_referencia, vendas)

    cestas_entregues = sum(1 for v in vendas if v.status_entrega == "entregue")
    cestas_pendentes = sum(1 for v in vendas if v.status_entrega == "pendente")

    clientes_inadimplentes = (
        db.query(models.Cliente).filter(models.Cliente.status == "inadimplente").count()
    )
    total_clientes_ativos = (
        db.query(models.Cliente).filter(models.Cliente.status == "ativo").count()
    )

    custos = (
        db.query(models.CustoCestaMensal)
        .options(joinedload(models.CustoCestaMensal.tipo_cesta))
        .filter(models.CustoCestaMensal.mes_referencia == mes_referencia)
        .all()
    )
    margem_media_pct = None
    if custos:
        total_preco = sum(c.tipo_cesta.preco_venda for c in custos)
        total_margem = sum(c.margem_calculada for c in custos)
        if total_preco > 0:
            margem_media_pct = round(total_margem / total_preco * 100, 1)

    saldos = (
        db.query(models.SaldoMensalEstoque)
        .options(joinedload(models.SaldoMensalEstoque.item))
        .filter(models.SaldoMensalEstoque.mes_referencia == mes_referencia)
        .all()
    )
    alertas = [
        {
            "item_id": s.item_id,
            "nome": s.item.nome,
            "unidade_medida": s.item.unidade_medida,
            "estoque_minimo": s.item.estoque_minimo,
            "quantidade_final": s.quantidade_final,
        }
        for s in saldos
        if s.item.estoque_minimo > 0 and s.quantidade_final <= s.item.estoque_minimo
    ]

    return {
        **sumario,
        "cestas_entregues": cestas_entregues,
        "cestas_pendentes_entrega": cestas_pendentes,
        "clientes_inadimplentes": clientes_inadimplentes,
        "total_clientes_ativos": total_clientes_ativos,
        "margem_media_pct": margem_media_pct,
        "alertas_estoque": alertas,
    }


@router.get("/evolucao")
def evolucao_vendas(db: Session = Depends(get_db)):
    meses = (
        db.query(models.Venda.mes_referencia)
        .distinct()
        .order_by(models.Venda.mes_referencia.desc())
        .limit(12)
        .all()
    )
    result = []
    for (mes,) in meses:
        vendas = _vendas_com_rel(db, mes)
        result.append(_sumarizar_mes(mes, vendas))
    return result


@router.get("/clientes")
def relatorio_clientes(mes_referencia: Optional[str] = None, db: Session = Depends(get_db)):
    vendas = _vendas_com_rel(db, mes_referencia)

    clientes_data: dict = {}
    for v in vendas:
        cid = v.cliente_id
        if cid not in clientes_data:
            clientes_data[cid] = {
                "id": cid,
                "nome": v.cliente.nome,
                "status": v.cliente.status,
                "total_vendas": 0,
                "total_cestas": 0,
                "valor_total": 0.0,
                "valor_pendente": 0.0,
            }
        clientes_data[cid]["total_vendas"] += 1
        clientes_data[cid]["total_cestas"] += v.quantidade
        clientes_data[cid]["valor_total"] += v.tipo_cesta.preco_venda * v.quantidade
        for p in v.pagamentos:
            if p.status in ("pendente", "atrasado"):
                clientes_data[cid]["valor_pendente"] += p.valor_esperado

    for c in clientes_data.values():
        c["valor_total"] = round(c["valor_total"], 2)
        c["valor_pendente"] = round(c["valor_pendente"], 2)

    ranking = sorted(clientes_data.values(), key=lambda x: -x["valor_total"])

    inadimplentes_db = (
        db.query(models.Cliente).filter(models.Cliente.status == "inadimplente").all()
    )
    inadimplentes = []
    for c in inadimplentes_db:
        pgts = (
            db.query(models.Pagamento)
            .filter(
                models.Pagamento.cliente_id == c.id,
                models.Pagamento.status.in_(["pendente", "atrasado"]),
            )
            .all()
        )
        inadimplentes.append({
            "id": c.id,
            "nome": c.nome,
            "telefone": c.telefone,
            "valor_em_aberto": round(sum(p.valor_esperado for p in pgts), 2),
        })

    return {"ranking": ranking, "inadimplentes": inadimplentes}
