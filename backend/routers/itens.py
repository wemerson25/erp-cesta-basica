from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/itens", tags=["itens"])


@router.get("/", response_model=List[schemas.ItemResponse])
def listar_itens(busca: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Item)
    if busca:
        q = q.filter(models.Item.nome.ilike(f"%{busca}%"))
    return q.order_by(models.Item.nome).all()


@router.post("/", response_model=schemas.ItemResponse, status_code=201)
def criar_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = models.Item(
        nome=payload.nome.strip(),
        unidade_medida=payload.unidade_medida,
        fornecedor_preferencial=payload.fornecedor_preferencial,
        estoque_minimo=payload.estoque_minimo,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=schemas.ItemResponse)
def buscar_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


@router.put("/{item_id}", response_model=schemas.ItemResponse)
def atualizar_item(item_id: int, payload: schemas.ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def deletar_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    usado = (
        db.query(models.ComposicaoCesta)
        .filter(models.ComposicaoCesta.item_id == item_id)
        .first()
    )
    if usado:
        raise HTTPException(
            status_code=400,
            detail="Este item faz parte da composição de uma ou mais cestas e não pode ser excluído.",
        )
    db.delete(item)
    db.commit()
