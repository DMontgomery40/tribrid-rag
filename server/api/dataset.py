from fastapi import APIRouter, UploadFile
from typing import Any
from starlette.responses import FileResponse

from server.models.eval import DatasetEntry

router = APIRouter(tags=["dataset"])


@router.get("/dataset", response_model=list[DatasetEntry])
async def list_dataset(repo_id: str) -> list[DatasetEntry]:
    raise NotImplementedError


@router.post("/dataset", response_model=DatasetEntry)
async def add_dataset_entry(entry: DatasetEntry) -> DatasetEntry:
    raise NotImplementedError


@router.put("/dataset/{entry_id}", response_model=DatasetEntry)
async def update_dataset_entry(entry_id: str, entry: DatasetEntry) -> DatasetEntry:
    raise NotImplementedError


@router.delete("/dataset/{entry_id}")
async def delete_dataset_entry(entry_id: str) -> dict[str, Any]:
    raise NotImplementedError


@router.post("/dataset/import")
async def import_dataset(file: UploadFile) -> list[DatasetEntry]:
    raise NotImplementedError


@router.get("/dataset/export")
async def export_dataset(repo_id: str) -> FileResponse:
    raise NotImplementedError
