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


# ── Vendas ────────────────────────────────────────────────────────────────────

class TipoCestaSimples(BaseModel):
    id: int
    nome: str
    preco_venda: float

    model_config = {"from_attributes": True}


class PagamentoResponse(BaseModel):
    id: int
    venda_id: int
    cliente_id: int
    valor_esperado: float
    valor_pago: Optional[float] = None
    data_pagamento: Optional[date] = None
    status: str
    data_vencimento: Optional[date] = None

    model_config = {"from_attributes": True}


class VendaCreate(BaseModel):
    cliente_id: int
    tipo_cesta_id: int
    mes_referencia: str  # YYYY-MM
    quantidade: int = 1
    forma_pagamento: str  # vista/prazo


class VendaEntregaUpdate(BaseModel):
    status_entrega: str


class VendaSimples(BaseModel):
    id: int
    mes_referencia: str
    quantidade: int
    forma_pagamento: str
    tipo_cesta: TipoCestaSimples

    model_config = {"from_attributes": True}


class VendaResponse(BaseModel):
    id: int
    cliente_id: int
    tipo_cesta_id: int
    mes_referencia: str
    quantidade: int
    forma_pagamento: str
    status_entrega: str
    data_venda: Optional[date] = None
    cliente: ClienteResponse
    tipo_cesta: TipoCestaSimples
    pagamentos: List[PagamentoResponse] = []

    model_config = {"from_attributes": True}


# ── Pagamentos ────────────────────────────────────────────────────────────────

class PagamentoDetalheResponse(BaseModel):
    id: int
    venda_id: int
    cliente_id: int
    valor_esperado: float
    valor_pago: Optional[float] = None
    data_pagamento: Optional[date] = None
    status: str
    data_vencimento: Optional[date] = None
    cliente: ClienteResponse
    venda: VendaSimples

    model_config = {"from_attributes": True}


class ReceberPagamentoInput(BaseModel):
    valor_pago: float
    data_pagamento: Optional[date] = None


# ── Estoque & Compras ─────────────────────────────────────────────────────────

class CompraCreate(BaseModel):
    item_id: int
    mes_referencia: str
    quantidade_comprada: float
    valor_unitario: float
    fornecedor: Optional[str] = None
    data_compra: Optional[date] = None


class CompraResponse(BaseModel):
    id: int
    item_id: int
    mes_referencia: str
    quantidade_comprada: float
    valor_unitario: float
    valor_total: float
    data_compra: Optional[date] = None
    fornecedor: Optional[str] = None
    item: ItemResponse

    model_config = {"from_attributes": True}


class SaldoMensalResponse(BaseModel):
    id: int
    item_id: int
    mes_referencia: str
    quantidade_inicial: float
    valor_inicial: float
    quantidade_comprada_mes: float
    valor_comprado_mes: float
    custo_medio_mes: float
    quantidade_consumida_mes: float
    quantidade_final: float
    valor_final: float
    item: ItemResponse

    model_config = {"from_attributes": True}


class CustoCestaMensalResponse(BaseModel):
    id: int
    tipo_cesta_id: int
    mes_referencia: str
    custo_total_calculado: float
    margem_calculada: float
    tipo_cesta: TipoCestaSimples

    model_config = {"from_attributes": True}


class MesInput(BaseModel):
    mes_referencia: str


# ── Configurações ─────────────────────────────────────────────────────────────

class ConfiguracaoResponse(BaseModel):
    id: int
    chave: str
    valor: str
    descricao: Optional[str] = None

    model_config = {"from_attributes": True}


class ConfiguracaoUpdate(BaseModel):
    valor: str
