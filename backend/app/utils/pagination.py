from typing import List, Any, Dict

def paginate(items: List[Any], page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    total_items = len(items)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    current_page = max(1, min(page, total_pages))
    
    start = (current_page - 1) * page_size
    end = start + page_size
    
    return {
        "items": items[start:end],
        "total": total_items,
        "page": current_page,
        "page_size": page_size,
        "total_pages": total_pages
    }
