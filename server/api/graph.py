from fastapi import APIRouter

from server.models.graph import Community, Entity, GraphStats, Relationship

router = APIRouter(tags=["graph"])


@router.get("/graph/{repo_id}/entities", response_model=list[Entity])
async def list_entities(repo_id: str, entity_type: str | None = None, limit: int = 100) -> list[Entity]:
    raise NotImplementedError


@router.get("/graph/{repo_id}/entity/{entity_id}", response_model=Entity)
async def get_entity(repo_id: str, entity_id: str) -> Entity:
    raise NotImplementedError


@router.get("/graph/{repo_id}/entity/{entity_id}/relationships", response_model=list[Relationship])
async def get_entity_relationships(repo_id: str, entity_id: str) -> list[Relationship]:
    raise NotImplementedError


@router.get("/graph/{repo_id}/communities", response_model=list[Community])
async def list_communities(repo_id: str, level: int | None = None) -> list[Community]:
    raise NotImplementedError


@router.get("/graph/{repo_id}/stats", response_model=GraphStats)
async def get_graph_stats(repo_id: str) -> GraphStats:
    raise NotImplementedError


@router.post("/graph/{repo_id}/query")
async def graph_query(repo_id: str, cypher: str) -> list[dict]:
    raise NotImplementedError
