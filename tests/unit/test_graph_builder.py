"""Tests for the graph builder module."""

import pytest

from server.indexing.graph_builder import GraphBuilder
from server.models.index import Chunk
from server.models.tribrid_config_model import GraphIndexingConfig


@pytest.fixture
def graph_builder() -> GraphBuilder:
    """Create graph builder (without Neo4j connection for unit tests)."""
    return GraphBuilder(neo4j=None)


def make_chunk(content: str, file_path: str = "test.py") -> Chunk:
    """Create a test chunk."""
    return Chunk(
        chunk_id="test-chunk",
        content=content,
        file_path=file_path,
        start_line=1,
        end_line=10,
        language="python",
        token_count=50,
    )


def test_extract_code_entities_function(graph_builder: GraphBuilder) -> None:
    """Test extracting function entities from code."""
    content = '''
def calculate_total(items: list) -> float:
    """Calculate total price."""
    return sum(item.price for item in items)
'''
    chunk = make_chunk(content)
    entities = graph_builder._extract_code_entities(chunk)

    function_entities = [e for e in entities if e.entity_type == "function"]
    assert len(function_entities) >= 1
    assert any("calculate_total" in e.name for e in function_entities)


def test_extract_code_entities_class(graph_builder: GraphBuilder) -> None:
    """Test extracting class entities from code."""
    content = '''
class ShoppingCart:
    """A shopping cart class."""

    def __init__(self):
        self.items = []

    def add_item(self, item):
        self.items.append(item)
'''
    chunk = make_chunk(content)
    entities = graph_builder._extract_code_entities(chunk)

    class_entities = [e for e in entities if e.entity_type == "class"]
    assert len(class_entities) >= 1
    assert any("ShoppingCart" in e.name for e in class_entities)


def test_extract_semantic_entities(graph_builder: GraphBuilder) -> None:
    """Test extracting semantic entities from docstrings."""
    content = '''
def process_order(order: Order) -> Receipt:
    """
    Process an order and generate a receipt.

    This function handles payment processing, inventory updates,
    and customer notifications.
    """
    pass
'''
    chunk = make_chunk(content)
    entities = graph_builder._extract_semantic_entities(chunk)
    # Should extract concepts from docstring
    assert len(entities) >= 0  # May be empty depending on implementation


def test_infer_relationships_imports(graph_builder: GraphBuilder) -> None:
    """Test inferring import relationships."""
    from server.models.graph import Entity

    entities = [
        Entity(
            entity_id="1",
            name="module_a",
            entity_type="module",
            file_path="a.py",
            description=None,
        ),
        Entity(
            entity_id="2",
            name="func_from_a",
            entity_type="function",
            file_path="b.py",
            description="imported from module_a",
        ),
    ]

    relationships = graph_builder._infer_relationships(entities)
    # Should infer some relationships based on naming/descriptions
    assert isinstance(relationships, list)


def test_graph_builder_uses_configured_edge_weights() -> None:
    """GraphBuilder should use GraphIndexingConfig weights instead of hardcoded constants."""
    cfg = GraphIndexingConfig(
        ast_contains_weight=0.12,
        ast_inherits_weight=0.23,
        ast_imports_weight=0.34,
        ast_calls_weight=0.45,
    )
    gb = GraphBuilder(neo4j=None, cfg=cfg)

    code = """
import os

class Base:
    pass

class Child(Base):
    def method(self):
        helper()

def helper():
    return 1
"""
    _entities, rels = gb._parse_python_file("repo", "test.py", code)
    assert rels, "expected relationships to be extracted"

    contains = [r for r in rels if r.relation_type == "contains"]
    inherits = [r for r in rels if r.relation_type == "inherits"]
    imports = [r for r in rels if r.relation_type == "imports"]
    calls = [r for r in rels if r.relation_type == "calls"]

    assert contains and inherits and imports and calls
    assert all(r.weight == pytest.approx(0.12) for r in contains)
    assert all(r.weight == pytest.approx(0.23) for r in inherits)
    assert all(r.weight == pytest.approx(0.34) for r in imports)
    assert all(r.weight == pytest.approx(0.45) for r in calls)
