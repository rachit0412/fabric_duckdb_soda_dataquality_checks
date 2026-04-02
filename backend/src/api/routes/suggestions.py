"""
FastAPI Routes: Check Suggestions
AI-driven recommendations for data quality checks
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import logging
import json

from src.api.models import SuggestionsRequest, SuggestionsResponse
from src.models.db import MetadataSnapshot, CheckSuggestion
from src.services.suggestions import SuggestionEngine
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["suggestions"])

suggestion_engine = SuggestionEngine()

@router.post("/", response_model=SuggestionsResponse)
async def get_suggestions(
    request: SuggestionsRequest,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated check suggestions for a dataset.
    """
    try:
        # Get metadata snapshot
        snapshot = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.id == request.metadata_snapshot_id
        ).first()
        
        if not snapshot:
            raise HTTPException(status_code=404, detail="Metadata snapshot not found")
        
        logger.info(f"Generating suggestions for snapshot: {snapshot.id}")
        
        # Extract schema and profile
        schema = json.loads(snapshot.schema_info) if snapshot.schema_info else {}
        profile = json.loads(snapshot.profile_info) if snapshot.profile_info else {}
        
        # Run suggestion engine
        suggestions_list = suggestion_engine.suggest_checks(
            schema=schema,
            profile=profile,
            confidence_threshold=request.confidence_threshold or 0.5
        )
        
        # Store suggestions in database
        stored_suggestions = []
        for suggestion in suggestions_list:
            db_suggestion = CheckSuggestion(
                metadata_snapshot_id=snapshot.id,
                check_name=suggestion['name'],
                description=suggestion['description'],
                check_configuration=json.dumps(suggestion['config']),
                confidence_score=suggestion['confidence'],
                rule_category=suggestion['category'],
                rationale=suggestion['rationale'],
            )
            db.add(db_suggestion)
            stored_suggestions.append(db_suggestion)
        
        db.commit()
        
        # Refresh to get IDs
        for s in stored_suggestions:
            db.refresh(s)
        
        logger.info(f"Generated {len(stored_suggestions)} suggestions")
        
        return SuggestionsResponse(
            metadata_snapshot_id=snapshot.id,
            suggestions=[
                {
                    'id': str(s.id),
                    'name': s.check_name,
                    'description': s.description,
                    'category': s.rule_category,
                    'confidence': s.confidence_score,
                    'configuration': json.loads(s.check_configuration) if s.check_configuration else {},
                    'rationale': s.rationale,
                }
                for s in stored_suggestions
            ],
            total_suggestions=len(stored_suggestions),
            generated_at=stored_suggestions[0].created_at if stored_suggestions else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{snapshot_id}", response_model=SuggestionsResponse)
async def get_snapshot_suggestions(
    snapshot_id: UUID,
    db: Session = Depends(get_db)
):
    """Get previously generated suggestions for a snapshot."""
    try:
        snapshot = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.id == snapshot_id
        ).first()
        
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        suggestions = db.query(CheckSuggestion).filter(
            CheckSuggestion.metadata_snapshot_id == snapshot_id
        ).all()
        
        return SuggestionsResponse(
            metadata_snapshot_id=snapshot_id,
            suggestions=[
                {
                    'id': str(s.id),
                    'name': s.check_name,
                    'description': s.description,
                    'category': s.rule_category,
                    'confidence': s.confidence_score,
                    'configuration': json.loads(s.check_configuration) if s.check_configuration else {},
                    'rationale': s.rationale,
                }
                for s in suggestions
            ],
            total_suggestions=len(suggestions),
            generated_at=suggestions[0].created_at if suggestions else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
