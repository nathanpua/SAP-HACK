#!/usr/bin/env python3
"""
ChromaDB MCP Server for SAP Onboarding Documents
Provides vector search capabilities for the onboarding agent
"""

import os
import sys
import json
import asyncio
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import numpy as np
from pathlib import Path

# Import MCP modules
from mcp.server.lowlevel import Server, NotificationOptions
from mcp import types
from mcp.server.models import InitializationOptions

class ChromaDBMCPServer:
    def __init__(self):
        # Initialize ChromaDB client
        # Use absolute path to ensure it works regardless of working directory
        default_data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db_data")
        self.data_path = os.getenv("DATA_PATH", default_data_path)
        self.collection_name = os.getenv("COLLECTION_NAME", "sap_policies")

        self.client = chromadb.PersistentClient(
            path=self.data_path,
            settings=Settings(anonymized_telemetry=False)
        )

        # Initialize embedding model
        self.embedding_model = None
        self.collection = None
        self.initialize_components()

    def initialize_components(self):
        """Initialize ChromaDB collection and embedding model."""
        try:
            print(f"DEBUG: Initializing with data_path={self.data_path}, collection_name={self.collection_name}", file=sys.stderr)
            print(f"DEBUG: Current working directory: {os.getcwd()}", file=sys.stderr)

            # Get or create collection
            try:
                self.collection = self.client.get_collection(self.collection_name)
                count = self.collection.count()
                print(f"✅ Connected to existing collection: {self.collection_name} (documents: {count})", file=sys.stderr)
            except ValueError:
                self.collection = self.client.create_collection(self.collection_name)
                print(f"✅ Created new collection: {self.collection_name}", file=sys.stderr)

            # Initialize embedding model (SentenceTransformers only)
            print("🔄 Loading SentenceTransformers embedding model...", file=sys.stderr)
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ Using SentenceTransformers embeddings", file=sys.stderr)

        except Exception as e:
            print(f"❌ Error initializing components: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.stderr.flush()
            sys.exit(1)

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings for text using SentenceTransformers."""
        try:
            print("DEBUG: Using SentenceTransformers embeddings", file=sys.stderr)
            embedding = self.embedding_model.encode(text).tolist()
            print(f"DEBUG: SentenceTransformers embedding generated, length: {len(embedding)}", file=sys.stderr)
            return embedding
        except Exception as e:
            print(f"DEBUG: Embedding generation failed: {type(e).__name__}: {str(e)}", file=sys.stderr)
            sys.stderr.flush()
            raise

    def search_documents(self, query: str, n_results: int = 5, category_filter: Optional[str] = None) -> Dict[str, Any]:
        """Search documents using vector similarity."""
        try:
            print(f"DEBUG: Starting search for query: {query}", file=sys.stderr)

            # Generate query embedding
            print("DEBUG: Generating embedding...", file=sys.stderr)
            query_embedding = self.generate_embedding(query)
            print(f"DEBUG: Embedding generated, length: {len(query_embedding)}", file=sys.stderr)

            # Prepare search parameters
            search_params = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances"]
            }

            if category_filter:
                search_params["where"] = {"category": category_filter}
                print(f"DEBUG: Using category filter: {category_filter}", file=sys.stderr)

            print(f"DEBUG: Search params: {search_params}", file=sys.stderr)

            # Perform search
            print("DEBUG: Executing ChromaDB query...", file=sys.stderr)
            results = self.collection.query(**search_params)
            print(f"DEBUG: Query completed. Results keys: {list(results.keys())}", file=sys.stderr)

            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                print(f"DEBUG: Found {len(results['documents'][0])} documents", file=sys.stderr)
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    formatted_results.append({
                        "rank": i + 1,
                        "content": doc[:200] + "..." if len(doc) > 200 else doc,
                        "source": metadata.get("source", "Unknown"),
                        "policy_number": metadata.get("policy_number", "N/A"),
                        "category": metadata.get("category", "General"),
                        "similarity_score": 1 - distance,  # Convert distance to similarity
                        "chunk_index": metadata.get("chunk_index", 0)
                    })
            else:
                print("DEBUG: No documents found in results", file=sys.stderr)

            result = {
                "query": query,
                "total_results": len(formatted_results),
                "results": formatted_results
            }
            print(f"DEBUG: Search completed successfully, returning {len(formatted_results)} results", file=sys.stderr)
            return result

        except Exception as e:
            print(f"DEBUG: Search failed with exception: {type(e).__name__}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.stderr.flush()
            return {"error": f"Search failed: {str(e)}"}

    def get_collection_info(self) -> Dict[str, Any]:
        """Get collection information."""
        try:
            count = self.collection.count()
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "data_path": self.data_path
            }
        except Exception as e:
            return {"error": f"Failed to get collection info: {str(e)}"}

# MCP Server Implementation
server = Server("chromadb-mcp-server")
chromadb_server = ChromaDBMCPServer()

# Define available tools
TOOLS = [
    types.Tool(
        name="search_onboarding_documents",
        description="Search SAP onboarding documents using vector similarity",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant documents"
                },
                "category_filter": {
                    "type": "string",
                    "description": "Optional category filter (e.g., 'HR', 'IT', 'Finance')",
                    "default": None
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    ),
    types.Tool(
        name="list_collections",
        description="List all available ChromaDB collections",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    types.Tool(
        name="get_collection_info",
        description="Get information about the current collection",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    )
]

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Return the list of available tools."""
    return TOOLS

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    """Handle tool execution."""
    print(f"DEBUG: handle_call_tool called with name={name}, arguments={arguments}")
    try:
        if name == "search_onboarding_documents":
            query = arguments.get("query", "")
            category_filter = arguments.get("category_filter")
            max_results = arguments.get("max_results", 5)

            results = chromadb_server.search_documents(query, max_results, category_filter)
            return [types.TextContent(type="text", text=json.dumps(results, indent=2))]

        elif name == "list_collections":
            try:
                collections = chromadb_server.client.list_collections()
                collection_names = [col.name for col in collections]
                result = {"collections": collection_names}
                return [types.TextContent(type="text", text=json.dumps(result, indent=2))]
            except Exception as e:
                return [types.TextContent(type="text", text=json.dumps({"error": f"Failed to list collections: {str(e)}"}))]

        elif name == "get_collection_info":
            info = chromadb_server.get_collection_info()
            return [types.TextContent(type="text", text=json.dumps(info, indent=2))]

        else:
            return [types.TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    except Exception as e:
        return [types.TextContent(type="text", text=json.dumps({"error": f"Tool execution failed: {str(e)}"}))]

async def main():
    """Main MCP server entry point."""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="chromadb-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
