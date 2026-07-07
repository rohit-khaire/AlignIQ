"""Shared vector retrieval helpers — Pinecone returns distance (lower = more similar)."""

import logging
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


def retrieve_relevant_docs(
    vectorstore,
    query: str,
    category: str | None = None,
    k: int = 3,
    top_n: int = 10,
) -> list[tuple[Document, float]]:
    """
    Retrieve top-N unique documents ranked by relevance.
    Scores are distances — lower means more similar.
    """
    unique_docs: dict[str, tuple[Document, float]] = {}

    def _search(use_filter: bool):
        kwargs: dict = {"k": k}
        if use_filter and category:
            kwargs["filter"] = {"category": category}
        return vectorstore.similarity_search_with_score(query, **kwargs)

    try:
        results = _search(use_filter=True)
        if not results and category:
            results = _search(use_filter=False)
    except Exception as e:
        logger.warning(f"Filtered search failed, retrying without filter: {e}")
        results = _search(use_filter=False)

    for doc, score in results:
        doc_text = doc.page_content
        if doc_text not in unique_docs or score < unique_docs[doc_text][1]:
            unique_docs[doc_text] = (doc, score)

    return sorted(unique_docs.values(), key=lambda x: x[1])[:top_n]


def format_docs_for_prompt(docs: list[tuple[Document, float]], label: str = "Retrieved Policy") -> str:
    parts = []
    for i, (doc, score) in enumerate(docs):
        meta = doc.metadata
        relevance = max(0, min(100, int((1 - min(score, 1.0)) * 100)))
        parts.append(
            f"\n--- {label} {i + 1} (relevance: {relevance}%) ---\n"
            f"ID: {meta.get('company_policy_id', 'N/A')}\n"
            f"Title: {meta.get('title', 'N/A')}\n"
            f"Category: {meta.get('category', 'N/A')}\n"
            f"Department: {meta.get('department', 'N/A')}\n"
            f"Text: {doc.page_content}\n"
        )
    return "".join(parts)
