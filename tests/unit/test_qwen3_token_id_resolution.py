from __future__ import annotations

from pathlib import Path

import pytest

from server.retrieval.mlx_qwen3 import resolve_yes_no_token_ids


class _TokenizerDifferent:
    all_special_ids = [0, 1, 2]

    def encode(self, text: str, add_special_tokens: bool = False) -> list[int]:  # noqa: ARG002
        if text.endswith("yes"):
            return [11, 101]
        if text.endswith("no"):
            return [11, 202]
        return [11, 303]


class _TokenizerSameId:
    all_special_ids = [0, 1, 2]

    def encode(self, text: str, add_special_tokens: bool = False) -> list[int]:  # noqa: ARG002
        if text.endswith("yes") or text.endswith("no"):
            return [11, 101]
        return [11, 303]


class _TokenizerSpecialId:
    all_special_ids = [0, 1, 2, 101]

    def encode(self, text: str, add_special_tokens: bool = False) -> list[int]:  # noqa: ARG002
        if text.endswith("yes"):
            return [11, 101]
        if text.endswith("no"):
            return [11, 202]
        return [11, 303]


def test_resolve_yes_no_token_ids_from_suffix_answers() -> None:
    ids = resolve_yes_no_token_ids(_TokenizerDifferent())
    assert ids.yes_id == 101
    assert ids.no_id == 202
    assert ids.yes_id != ids.no_id


def test_resolve_yes_no_token_ids_rejects_equal_ids() -> None:
    with pytest.raises(ValueError, match="yes_id == no_id"):
        resolve_yes_no_token_ids(_TokenizerSameId())


def test_resolve_yes_no_token_ids_rejects_special_tokens() -> None:
    with pytest.raises(ValueError, match="special token"):
        resolve_yes_no_token_ids(_TokenizerSpecialId())


def test_resolve_yes_no_token_ids_smoke_with_local_tokenizer() -> None:
    transformers = pytest.importorskip("transformers")
    tiny = Path(".tests/reranker_proof/tiny_cross_encoder").resolve()
    if not tiny.exists():
        pytest.skip("Local tiny tokenizer fixture missing")

    tokenizer = transformers.AutoTokenizer.from_pretrained(str(tiny), use_fast=True)  # type: ignore[no-untyped-call]
    ids = resolve_yes_no_token_ids(tokenizer)
    assert isinstance(ids.yes_id, int)
    assert isinstance(ids.no_id, int)
    assert ids.yes_id != ids.no_id
