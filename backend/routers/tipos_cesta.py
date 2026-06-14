from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/tipos-cesta", tags=["tipos_cesta"])


def _buscar_com_composicao(db: Session, cesta_id: int) -> models.TipoCesta:
    return (
        db.query(models.TipoCesta)
        .options(
            joinedload(models.TipoCesta.composicoes).joinedload(models.ComposicaoCesta.item)
        )
        .filter(models.TipoCesta.id == cesta_id)
        .first()
    )


@router.get("/", response_model=List[schemas.TipoCestaResponse])
def listar_tipos(db: Session = Depends(get_db)):
    return (
        db.query(models.TipoCesta)
        .options(
            joinedload(models.TipoCesta.composicoes).joinedload(models.ComposicaoCesta.item)
        )
        .order_by(models.TipoCesta.nome)
        .all()
    )


@router.post("/", response_model=schemas.TipoCestaResponse, status_code=201)
def criar_tipo(payload: schemas.TipoCestaCreate, db: Session = Depends(get_db)):
    cesta = models.TipoCesta(
        nome=payload.nome.strip(),
        preco_venda=payload.preco_venda,
        descricao=payload.descricao,
    )
    db.add(cesta)
    db.commit()
    db.refresh(cesta)
    return _buscar_com_composicao(db, cesta.id)


@router.get("/{cesta_id}", response_model=schemas.TipoCestaResponse)
def buscar_tipo(cesta_id: int, db: Session = Depends(get_db)):
    cesta = _buscar_com_composicao(db, cesta_id)
    if not cesta:
        raise HTTPException(status_code=404, detail="Tipo de cesta não encontrado")
    return cesta


@router.put("/{cesta_id}", response_model=schemas.TipoCestaResponse)
def atualizar_tipo(
    cesta_id: int, payload: schemas.TipoCestaUpdate, db: Session = Depends(get_db)
):
    cesta = db.query(models.TipoCesta).filter(models.TipoCesta.id == cesta_id).first()
    if not cesta:
        raise HTTPException(status_code=404, detail="Tipo de cesta não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(cesta, campo, valor)
    db.commit()
    return _buscar_com_composicao(db, cesta_id)


@router.delete("/{cesta_id}", status_code=204)
def deletar_tipo(cesta_id: int, db: Session = Depends(get_db)):
    cesta = db.query(models.TipoCesta).filter(models.TipoCesta.id == cesta_id).first()
    if not cesta:
        raise HTTPException(status_code=404, detail="Tipo de cesta não encontrado")
    vendas = db.query(models.Venda).filter(models.Venda.tipo_cesta_id == cesta_id).first()
    if vendas:
        raise HTTPException(
            status_code=400,
            detail="Esta cesta possui vendas registradas e não pode ser excluída.",
        )
    db.delete(cesta)
    db.commit()


@router.put("/{cesta_id}/composicao", response_model=schemas.TipoCestaResponse)
def atualizar_composicao(
    cesta_id: int, payload: schemas.ComposicaoUpdate, db: Session = Depends(get_db)
):
    cesta = db.query(models.TipoCesta).filter(models.TipoCesta.id == cesta_id).first()
    if not cesta:
        raise HTTPException(status_code=404, detail="Tipo de cesta não encontrado")

    for entrada in payload.itens:
        if entrada.quantidade <= 0:
            raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero")
        item = db.query(models.Item).filter(models.Item.id == entrada.item_id).first()
        if not item:
            raise HTTPException(
                status_code=400, detail=f"Item {entrada.item_id} não encontrado"
            )

    db.query(models.ComposicaoCesta).filter(
        models.ComposicaoCesta.tipo_cesta_id == cesta_id
    ).delete()

    for entrada in payload.itens:
        db.add(
            models.ComposicaoCesta(
                tipo_cesta_id=cesta_id,
                item_id=entrada.item_id,
                quantidade=entrada.quantidade,
            )
        )

    db.commit()
    return _buscar_com_composicao(db, cesta_id)
