#!/usr/bin/env python3
"""
Test script for ChromaDB integration with SAP onboarding documents
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from chromadb_mcp_server import ChromaDBMCPServer

def test_chromadb_basic():
    """Test basic ChromaDB functionality."""
    print("🧪 Testing ChromaDB Basic Functionality")
    print("=" * 50)

    server = ChromaDBMCPServer()

    # Test collection creation
    print("✅ ChromaDB server initialized")
    print(f"📚 Collection: {server.collection_name}")
    print(f"📁 Data path: {server.data_path}")

    # Test collection info
    info = server.get_collection_info()
    print(f"📊 Collection info: {json.dumps(info, indent=2)}")

    return server

def test_document_ingestion(server):
    """Test document ingestion functionality."""
    print("\n🧪 Testing Document Ingestion")
    print("=" * 50)

    # Check if sample documents exist
    sample_docs_dir = Path("sample_documents")
    if not sample_docs_dir.exists():
        print("❌ Sample documents directory not found")
        return False

    # Find text files
    txt_files = list(sample_docs_dir.glob("*.txt"))
    print(f"📄 Found {len(txt_files)} text files")

    if not txt_files:
        print("❌ No text files found in sample_documents directory")
        return False

    # Test ingesting first document
    test_file = txt_files[0]
    print(f"📥 Testing ingestion of: {test_file.name}")

    results = server.add_documents([str(test_file)])

    if results["processed"] > 0:
        print(f"✅ Successfully processed {results['processed']} documents")
        print(f"⏭️  Skipped: {results['skipped']}")
        return True
    else:
        print("❌ Document ingestion failed")
        if results["errors"]:
            for error in results["errors"]:
                print(f"   Error: {error}")
        return False

def test_vector_search(server):
    """Test vector search functionality."""
    print("\n🧪 Testing Vector Search")
    print("=" * 50)

    test_queries = [
        "What equipment do new employees receive?",
        "How do I set up my SAP email?",
        "What's the hotel limit for business travel?",
        "How much PTO do I accrue annually?",
        "What are the remote work policies?"
    ]

    for query in test_queries:
        print(f"\n🔍 Searching: '{query}'")
        results = server.search_documents(query, n_results=3)

        if results["results"]:
            print(f"   📊 Found {len(results['results'])} results")
            for result in results["results"][:2]:  # Show top 2
                print(f"   • {result['source']} (Similarity: {result['similarity_score']:.3f})")
                print(f"     \"{result['content'][:100]}...\"")
        else:
            print("   ❌ No results found")

    return True

def test_collection_stats(server):
    """Test collection statistics."""
    print("\n🧪 Testing Collection Statistics")
    print("=" * 50)

    stats = server.get_collection_info()
    print(f"📊 Collection Statistics:")
    print(f"   • Total documents: {stats.get('document_count', 0)}")

    if 'categories' in stats:
        print("   • Categories:")
        for category, count in stats['categories'].items():
            print(f"     - {category}: {count}")

    if 'unique_sources' in stats:
        print(f"   • Unique sources: {stats['unique_sources']}")

    return True

def main():
    """Run all ChromaDB integration tests."""
    print("🚀 ChromaDB Integration Test Suite")
    print("=" * 60)

    try:
        # Test basic functionality
        server = test_chromadb_basic()
        if not server:
            print("❌ Basic functionality test failed")
            return False

        # Test document ingestion
        if not test_document_ingestion(server):
            print("❌ Document ingestion test failed")
            return False

        # Test vector search
        if not test_vector_search(server):
            print("❌ Vector search test failed")
            return False

        # Test collection stats
        if not test_collection_stats(server):
            print("❌ Collection stats test failed")
            return False

        print("\n🎉 All ChromaDB integration tests passed!")
        print("=" * 60)
        print("✅ ChromaDB is ready for SAP onboarding agent integration")
        print("\n📋 Next Steps:")
        print("1. Run full ingestion: python scripts/ingest_chromadb_docs.py sample_documents/")
        print("2. Start the orchestra: python examples/career_coach/main_web.py")
        print("3. Test onboarding questions in the web interface")

        return True

    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
