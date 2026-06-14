from pydantic import BaseModel
from datetime import date
from typing import Optional, List


# ── Clientes ─────────────────────────────────────────────────────────────────

class ClienteBase(BaseModel):
    nome: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    status: str = "ativo"
    observacoes: Optional[str] = None


class ClienteCreate(ClienteBase):
    data_cadastro: Optional[date] = None


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None


class ClienteStatusUpdate(BaseModel):
    status: str


class ClienteResponse(ClienteBase):
    id: int
    data_cadastro: Optional[date] = None

    model_config = {"from_attributes": True}


# ── Itens ─────────────────────────────────────────────────────────────────────

class ItemBase(BaseModel):
    nome: str
    unidade_medida: Optional[str] = None
    fornecedor_preferencial: Optional[str] = None
    estoque_minimo: float = 0


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    nome: Optional[str] = None
    unidade_medida: Optional[str] = None
    fornecedor_preferencial: Optional[str] = None
    estoque_minimo: Optional[float] = None


class ItemResponse(ItemBase):
    id: int

    model_config = {"from_attributes": True}


# ── Tipos de Cesta ────────────────────────────────────────────────────────────

class TipoCestaBase(BaseModel):
    nome: str
    preco_venda: float
    descricao: Optional[str] = None


class TipoCestaCreate(TipoCestaBase):
    pass


class TipoCestaUpdate(BaseModel):
    nome: Optional[str] = None
    preco_venda: Optional[float] = None
    descricao: Optional[str] = None


class ComposicaoItemNested(BaseModel):
    id: int
    item_id: int
    quantidade: float
    item: ItemResponse

    model_config = {"from_attributes": True}


class TipoCestaResponse(TipoCestaBase):
    id: int
    composicoes: List[ComposicaoItemNested] = []

    model_config = {"from_attributes": True}


# ── Composição ────────────────────────────────────────────────────────────────

class ComposicaoItemInput(BaseModel):
    item_id: int
    quantidade: float


class ComposicaoUpdate(BaseModel):
    itens: List[ComposicaoItemInput]
