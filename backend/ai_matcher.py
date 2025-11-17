"""
AI-powered semantic matching engine using Claude API
Provides intelligent matching of construction work items
"""
import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    Anthropic = None

from config import config


# In-memory cache for AI responses
_ai_cache: Dict[str, Tuple[Any, datetime]] = {}


def _get_cache_key(werkzaamheid: Dict[str, Any], candidates: List[Dict[str, Any]]) -> str:
    """Generate cache key from werkzaamheid and candidates"""
    data = {
        "w": werkzaamheid.get("omschrijving", ""),
        "e": werkzaamheid.get("eenheid", ""),
        "c": [c.get("code", "") for c in candidates]
    }
    return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()


def _get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    """Get cached AI response if available and not expired"""
    if not config.CACHE_ENABLED:
        return None

    if cache_key in _ai_cache:
        response, timestamp = _ai_cache[cache_key]
        if datetime.now() - timestamp < timedelta(hours=config.CACHE_TTL_HOURS):
            return response

        # Expired, remove from cache
        del _ai_cache[cache_key]

    return None


def _cache_response(cache_key: str, response: Dict[str, Any]):
    """Cache AI response"""
    if config.CACHE_ENABLED:
        _ai_cache[cache_key] = (response, datetime.now())


def clear_cache():
    """Clear the AI response cache"""
    global _ai_cache
    _ai_cache = {}


def build_matching_prompt(
    werkzaamheid: Dict[str, Any],
    candidates: List[Dict[str, Any]]
) -> str:
    """
    Build a prompt for Claude to semantically match a werkzaamheid
    with the best candidate from the prijzenboek
    """
    # Format candidates list
    candidates_text = "\n".join([
        f"{i+1}. Code: {c.get('code', 'N/A')}\n"
        f"   Omschrijving: {c.get('omschrijving', 'N/A')}\n"
        f"   Eenheid: {c.get('eenheid', 'N/A')}\n"
        f"   Prijs: €{c.get('prijs_per_stuk', 0):.2f} per {c.get('eenheid', 'stu')}"
        for i, c in enumerate(candidates)
    ])

    prompt = f"""Je bent een expert in Nederlandse bouw- en renovatieterminologie.
Je taak is om een werkzaamheid uit een opnamerapport te matchen met de beste optie uit een prijzenboek.

WERKZAAMHEID UIT OPNAME:
- Omschrijving: {werkzaamheid.get('omschrijving', 'N/A')}
- Hoeveelheid: {werkzaamheid.get('hoeveelheid', 1)}
- Eenheid: {werkzaamheid.get('eenheid', 'stu')}

KANDIDATEN UIT PRIJZENBOEK:
{candidates_text}

INSTRUCTIES:
1. Analyseer de werkzaamheid en begrijp wat er precies bedoeld wordt
2. Vergelijk met elke kandidaat op basis van:
   - Semantische betekenis (niet alleen tekst-overeenkomst)
   - Type werkzaamheid (verwijderen, vervangen, schilderen, etc.)
   - Materiaal of object (behang, kozijn, radiator, etc.)
   - Eenheid compatibiliteit (m2, m1, stuks, etc.)
3. Kies de beste match

BELANGRIJK:
- Een "gipsplaten wand plaatsen" kan matchen met "Gipsplaat aanbrengen" ook al zijn de woorden anders
- "behang verwijderen" kan matchen met "wandbekleding verwijderen incl. lijmresten"
- Let op de context van bouwwerkzaamheden

Geef je antwoord in het volgende JSON formaat (alleen JSON, geen andere tekst):
{{
  "best_match_index": 1,
  "confidence": 0.95,
  "reasoning": "Korte uitleg waarom dit de beste match is"
}}

waarbij best_match_index het nummer is van de kandidaat (1-{len(candidates)}).
"""
    return prompt


async def ai_semantic_match(
    werkzaamheid: Dict[str, Any],
    candidates: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Use Claude API to semantically match a werkzaamheid with the best candidate

    Returns:
        Dict with keys: best_match_index, confidence, reasoning
        Or None if AI matching fails
    """
    if not ANTHROPIC_AVAILABLE:
        return None

    if not config.is_ai_available():
        return None

    if not candidates:
        return None

    # Check cache first
    cache_key = _get_cache_key(werkzaamheid, candidates)
    cached = _get_cached_response(cache_key)
    if cached:
        return cached

    try:
        client = Anthropic(api_key=config.ANTHROPIC_API_KEY)

        prompt = build_matching_prompt(werkzaamheid, candidates)

        message = client.messages.create(
            model=config.AI_MODEL,
            max_tokens=500,
            timeout=config.AI_TIMEOUT_SECONDS,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract JSON from response
        response_text = message.content[0].text.strip()

        # Try to parse JSON response
        try:
            # Handle potential markdown code blocks
            if response_text.startswith("```"):
                # Extract JSON from code block
                lines = response_text.split("\n")
                json_lines = []
                in_json = False
                for line in lines:
                    if line.startswith("```") and not in_json:
                        in_json = True
                        continue
                    elif line.startswith("```") and in_json:
                        break
                    elif in_json:
                        json_lines.append(line)
                response_text = "\n".join(json_lines)

            result = json.loads(response_text)

            # Validate response structure
            if "best_match_index" not in result:
                return None

            # Convert to 0-based index
            best_index = int(result["best_match_index"]) - 1
            if best_index < 0 or best_index >= len(candidates):
                return None

            ai_result = {
                "best_match_index": best_index,
                "confidence": float(result.get("confidence", 0.8)),
                "reasoning": result.get("reasoning", "AI semantic match")
            }

            # Cache the result
            _cache_response(cache_key, ai_result)

            return ai_result

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"Failed to parse AI response: {e}")
            print(f"Response was: {response_text}")
            return None

    except Exception as e:
        print(f"AI matching error: {e}")
        return None


def ai_batch_match(
    werkzaamheden: List[Dict[str, Any]],
    prijzenboek: List[Dict[str, Any]],
    get_candidates_func
) -> List[Optional[Dict[str, Any]]]:
    """
    Batch process multiple werkzaamheden for AI matching
    This is a sync wrapper that could be optimized for batch API calls

    Args:
        werkzaamheden: List of work items to match
        prijzenboek: Full prijzenboek list
        get_candidates_func: Function to get top N candidates for a werkzaamheid

    Returns:
        List of AI match results (or None for items that failed)
    """
    import asyncio

    results = []
    for werkzaamheid in werkzaamheden:
        candidates = get_candidates_func(werkzaamheid, prijzenboek)
        result = asyncio.run(ai_semantic_match(werkzaamheid, candidates))
        results.append(result)

    return results


def get_ai_stats() -> Dict[str, Any]:
    """Get statistics about AI matching"""
    return {
        "cache_size": len(_ai_cache),
        "ai_available": ANTHROPIC_AVAILABLE and config.is_ai_available(),
        "model": config.AI_MODEL if config.is_ai_available() else None,
        "cache_enabled": config.CACHE_ENABLED,
    }
