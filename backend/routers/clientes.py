from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

STATUSES_VALIDOS = {"ativo", "inativo", "inadimplente"}


@router.get("", response_model=List[schemas.ClienteResponse])
def listar_clientes(
    status: Optional[str] = None,
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Cliente)
    if status:
        q = q.filter(models.Cliente.status == status)
    if busca:
        q = q.filter(models.Cliente.nome.ilike(f"%{busca}%"))
    return q.order_by(models.Cliente.nome).all()


@router.post("", response_model=schemas.ClienteResponse, status_code=201)
def criar_cliente(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    cliente = models.Cliente(
        nome=payload.nome.strip(),
        telefone=payload.telefone,
        endereco=payload.endereco,
        bairro=payload.bairro,
        data_cadastro=payload.data_cadastro or date.today(),
        status=payload.status,
        observacoes=payload.observacoes,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/{cliente_id}", response_model=schemas.ClienteResponse)
def buscar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=schemas.ClienteResponse)
def atualizar_cliente(
    cliente_id: int,
    payload: schemas.ClienteUpdate,
    db: Session = Depends(get_db),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    dados = payload.model_dump(exclude_unset=True)
    if "nome" in dados:
        dados["nome"] = dados["nome"].strip()
    for campo, valor in dados.items():
        setattr(cliente, campo, valor)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.patch("/{cliente_id}/status", response_model=schemas.ClienteResponse)
def atualizar_status(
    cliente_id: int,
    payload: schemas.ClienteStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.status not in STATUSES_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {', '.join(STATUSES_VALIDOS)}")
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    cliente.status = payload.status
    db.commit()
    db.refresh(cliente)
    return cliente
