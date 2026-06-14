from datetime import date
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    telefone = Column(String(20))
    endereco = Column(String(300))
    bairro = Column(String(100))
    data_cadastro = Column(Date, default=date.today)
    status = Column(String(20), default="ativo")  # ativo/inativo/inadimplente
    observacoes = Column(Text)

    vendas = relationship("Venda", back_populates="cliente")
    pagamentos = relationship("Pagamento", back_populates="cliente")


class TipoCesta(Base):
    __tablename__ = "tipos_cesta"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    preco_venda = Column(Float, nullable=False)
    descricao = Column(Text)

    composicoes = relationship("ComposicaoCesta", back_populates="tipo_cesta", cascade="all, delete-orphan")
    vendas = relationship("Venda", back_populates="tipo_cesta")
    custos_mensais = relationship("CustoCestaMensal", back_populates="tipo_cesta")


class Item(Base):
    __tablename__ = "itens"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    unidade_medida = Column(String(20))
    fornecedor_preferencial = Column(String(200))
    estoque_minimo = Column(Float, default=0)

    composicoes = relationship("ComposicaoCesta", back_populates="item")
    compras = relationship("Compra", back_populates="item")
    saldos_mensais = relationship("SaldoMensalEstoque", back_populates="item")


class ComposicaoCesta(Base):
    __tablename__ = "composicao_cesta"

    id = Column(Integer, primary_key=True, index=True)
    tipo_cesta_id = Column(Integer, ForeignKey("tipos_cesta.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    quantidade = Column(Float, nullable=False)

    __table_args__ = (UniqueConstraint("tipo_cesta_id", "item_id"),)

    tipo_cesta = relationship("TipoCesta", back_populates="composicoes")
    item = relationship("Item", back_populates="composicoes")


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo_cesta_id = Column(Integer, ForeignKey("tipos_cesta.id"), nullable=False)
    mes_referencia = Column(String(7), nullable=False)  # YYYY-MM
    quantidade = Column(Integer, default=1)
    forma_pagamento = Column(String(10), nullable=False)  # vista/prazo
    status_entrega = Column(String(20), default="pendente")  # pendente/entregue
    data_venda = Column(Date, default=date.today)

    cliente = relationship("Cliente", back_populates="vendas")
    tipo_cesta = relationship("TipoCesta", back_populates="vendas")
    pagamentos = relationship("Pagamento", back_populates="venda", cascade="all, delete-orphan")


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    venda_id = Column(Integer, ForeignKey("vendas.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    valor_esperado = Column(Float, nullable=False)
    valor_pago = Column(Float)
    data_pagamento = Column(Date)
    status = Column(String(20), default="pendente")  # pendente/pago/atrasado
    data_vencimento = Column(Date)

    venda = relationship("Venda", back_populates="pagamentos")
    cliente = relationship("Cliente", back_populates="pagamentos")


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    mes_referencia = Column(String(7), nullable=False)
    quantidade_comprada = Column(Float, nullable=False)
    valor_unitario = Column(Float, nullable=False)
    valor_total = Column(Float, nullable=False)
    data_compra = Column(Date, default=date.today)
    fornecedor = Column(String(200))

    item = relationship("Item", back_populates="compras")


class SaldoMensalEstoque(Base):
    __tablename__ = "saldo_mensal_estoque"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    mes_referencia = Column(String(7), nullable=False)
    quantidade_inicial = Column(Float, default=0)
    valor_inicial = Column(Float, default=0)
    quantidade_comprada_mes = Column(Float, default=0)
    valor_comprado_mes = Column(Float, default=0)
    custo_medio_mes = Column(Float, default=0)
    quantidade_consumida_mes = Column(Float, default=0)
    quantidade_final = Column(Float, default=0)
    valor_final = Column(Float, default=0)

    __table_args__ = (UniqueConstraint("item_id", "mes_referencia"),)

    item = relationship("Item", back_populates="saldos_mensais")


class CustoCestaMensal(Base):
    __tablename__ = "custo_cesta_mensal"

    id = Column(Integer, primary_key=True, index=True)
    tipo_cesta_id = Column(Integer, ForeignKey("tipos_cesta.id"), nullable=False)
    mes_referencia = Column(String(7), nullable=False)
    custo_total_calculado = Column(Float, default=0)
    margem_calculada = Column(Float, default=0)

    __table_args__ = (UniqueConstraint("tipo_cesta_id", "mes_referencia"),)

    tipo_cesta = relationship("TipoCesta", back_populates="custos_mensais")


class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(100), unique=True, nullable=False)
    valor = Column(String(500), nullable=False)
    descricao = Column(String(300))
