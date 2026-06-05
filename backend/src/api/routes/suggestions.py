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
    Accepts either metadata_snapshot_id or connection_id (gets latest snapshot).
    """
    try:
        # Get metadata snapshot
        snapshot = None
        if request.metadata_snapshot_id:
            snapshot = db.query(MetadataSnapshot).filter(
                MetadataSnapshot.id == request.metadata_snapshot_id
            ).first()
        elif request.connection_id:
            # Get latest snapshot for connection
            snapshot = db.query(MetadataSnapshot).filter(
                MetadataSnapshot.connection_id == request.connection_id
            ).order_by(MetadataSnapshot.created_at.desc()).first()
        else:
            raise HTTPException(status_code=400, detail="Must provide either metadata_snapshot_id or connection_id")
        
        if not snapshot:
            raise HTTPException(status_code=404, detail="Metadata snapshot not found")
        
        logger.info(f"Generating suggestions for snapshot: {snapshot.id}")
        
        # Extract schema and profile (already deserialized by SQLAlchemy)
        schema = snapshot.schema_json if isinstance(snapshot.schema_json, dict) else (json.loads(snapshot.schema_json) if snapshot.schema_json else {})
        profile = snapshot.profile_json if isinstance(snapshot.profile_json, dict) else (json.loads(snapshot.profile_json) if snapshot.profile_json else {})
        
        # Type mapping to normalize profiler types to SQL types
        type_mapping = {
            'NUMBER': 'NUMERIC',
            'STRING': 'VARCHAR',
            'Date': 'TIMESTAMP',
            'bool': 'BOOLEAN',
            'Boolean': 'BOOLEAN',
        }
        
        # Merge profile data into schema columns for suggestion rules
        enriched_schema = schema.copy()
        if 'columns' in enriched_schema and profile:
            for column in enriched_schema['columns']:
                col_name = column.get('name')
                if col_name and col_name in profile:
                    col_profile = profile[col_name]
                    column['row_count'] = col_profile.get('row_count', 0)
                    column['null_count'] = col_profile.get('null_count', 0)
                    column['null_percent'] = col_profile.get('null_percent', 0)
                    column['distinct_count'] = col_profile.get('distinct_count', 0)
                    # Pass numeric bounds so range rules can use observed data
                    if 'min' in col_profile:
                        column['min'] = col_profile.get('min')
                    if 'max' in col_profile:
                        column['max'] = col_profile.get('max')
                # Normalize type names
                original_type = column.get('type', '')
                column['type'] = type_mapping.get(original_type, original_type)
        
        # Run suggestion engine
        suggestions_list = suggestion_engine.generate_suggestions(
            schema=enriched_schema
        )
        
        # Store suggestions in database
        stored_suggestions = []
        for suggestion in suggestions_list:
            db_suggestion = CheckSuggestion(
                metadata_snapshot_id=snapshot.id,
                rule_id=suggestion.get('rule_id', ''),
                check_name=suggestion.get('check_name', ''),
                check_type=suggestion.get('check_type', ''),
                rationale=suggestion.get('rationale', ''),
                suggested_check_yaml=suggestion.get('suggested_yaml', ''),
                confidence_score=suggestion.get('confidence', 0.5),
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
                    'rule_id': s.rule_id,
                    'check_name': s.check_name,
                    'check_type': s.check_type,
                    'rationale': s.rationale,
                    'confidence': s.confidence_score,
                    'suggested_check_yaml': s.suggested_check_yaml,
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
