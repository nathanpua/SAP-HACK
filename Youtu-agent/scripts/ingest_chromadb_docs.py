#!/usr/bin/env python3
"""
Document Ingestion Script for ChromaDB
Processes SAP policy documents and stores them in ChromaDB for vector search
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import time

class SAPDocumentIngester:
    def __init__(self, data_path: str = "./chroma_db_data", collection_name: str = "sap_policies"):
        """Initialize the document ingester."""
        self.data_path = data_path
        self.collection_name = collection_name

        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=self.data_path,
            settings=Settings(anonymized_telemetry=False)
        )

        # Initialize embedding model (SentenceTransformers only)
        print("🔄 Loading SentenceTransformers embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Using SentenceTransformers embeddings")

        # Create or get collection
        try:
            self.collection = self.client.get_collection(self.collection_name)
            print(f"✅ Connected to existing collection: {self.collection_name}")
        except:
            self.collection = self.client.create_collection(self.collection_name)
            print(f"✅ Created new collection: {self.collection_name}")

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using SentenceTransformers."""
        return self.embedding_model.encode(text).tolist()

    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """Split text into overlapping chunks for better retrieval."""
        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + chunk_size

            # Find the end of the current chunk
            if end >= text_length:
                chunk = text[start:].strip()
            else:
                # Try to break at sentence boundaries
                chunk = text[start:end]
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')

                if last_period > chunk_size * 0.7:
                    end = start + last_period + 1
                    chunk = text[start:end].strip()
                elif last_newline > chunk_size * 0.7:
                    end = start + last_newline + 1
                    chunk = text[start:end].strip()
                else:
                    chunk = chunk.strip()

            if len(chunk) > 50:  # Only keep substantial chunks
                chunks.append(chunk)

            start = end - overlap

        return chunks

    def extract_metadata(self, file_path: Path, content: str) -> Dict[str, Any]:
        """Extract metadata from SAP document content."""
        metadata = {
            "source": file_path.name,
            "file_path": str(file_path),
            "word_count": len(content.split()),
            "category": "General",
            "document_type": "policy"
        }

        lines = content.split('\n')

        # Extract policy information from first few lines
        for line in lines[:15]:
            line = line.strip()
            if 'Policy Number:' in line:
                policy_num = line.split('Policy Number:')[1].strip()
                metadata["policy_number"] = policy_num
                if 'SAP-POL-' in policy_num:
                    metadata["policy_type"] = "corporate_policy"
                elif 'SAP-SOP-' in policy_num:
                    metadata["policy_type"] = "standard_operating_procedure"

            elif 'Effective Date:' in line:
                metadata["effective_date"] = line.split('Effective Date:')[1].strip()
            elif 'Last Revised:' in line:
                metadata["last_revised"] = line.split('Last Revised:')[1].strip()
            elif 'Approved By:' in line:
                metadata["approved_by"] = line.split('Approved By:')[1].strip()
            elif 'Document Owner:' in line:
                metadata["document_owner"] = line.split('Document Owner:')[1].strip()

        # Categorize by content analysis
        content_lower = content.lower()

        if any(term in content_lower for term in ['travel', 'expense', 'reimbursement', 'per diem', 'hotel']):
            metadata["category"] = "Finance"
            metadata["subcategory"] = "Travel & Expenses"
        elif any(term in content_lower for term in ['hr', 'human resources', 'onboarding', 'pto', 'vacation', 'leave']):
            metadata["category"] = "HR"
            if 'onboarding' in content_lower:
                metadata["subcategory"] = "Onboarding"
            elif 'pto' in content_lower or 'vacation' in content_lower:
                metadata["subcategory"] = "Time Off"
            else:
                metadata["subcategory"] = "General HR"
        elif any(term in content_lower for term in ['security', 'password', 'vpn', 'firewall', 'encryption']):
            metadata["category"] = "IT"
            metadata["subcategory"] = "Security"
        elif any(term in content_lower for term in ['performance', 'review', 'development', 'goals', 'feedback']):
            metadata["category"] = "HR"
            metadata["subcategory"] = "Performance Management"
        elif any(term in content_lower for term in ['remote', 'work', 'hybrid', 'flexible']):
            metadata["category"] = "HR"
            metadata["subcategory"] = "Work Arrangements"
        elif any(term in content_lower for term in ['benefits', 'insurance', 'retirement', 'compensation']):
            metadata["category"] = "HR"
            metadata["subcategory"] = "Benefits & Compensation"
        elif any(term in content_lower for term in ['facility', 'building', 'parking', 'office']):
            metadata["category"] = "Operations"
            metadata["subcategory"] = "Facilities"
        elif any(term in content_lower for term in ['it support', 'help desk', 'troubleshooting']):
            metadata["category"] = "IT"
            metadata["subcategory"] = "Support"
        elif any(term in content_lower for term in ['culture', 'values', 'company']):
            metadata["category"] = "Corporate"
            metadata["subcategory"] = "Culture & Values"

        return metadata

    def process_document(self, file_path: Path) -> Dict[str, Any]:
        """Process a single document and add it to ChromaDB."""
        result = {
            "file": str(file_path),
            "status": "processing",
            "chunks_added": 0,
            "error": None
        }

        try:
            print(f"📄 Processing: {file_path.name}")

            # Read document content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if len(content.strip()) < 100:
                result["status"] = "skipped"
                result["error"] = "Content too short"
                return result

            # Extract metadata
            metadata = self.extract_metadata(file_path, content)

            # Chunk the document
            chunks = self.chunk_text(content)

            if not chunks:
                result["status"] = "skipped"
                result["error"] = "No valid chunks generated"
                return result

            print(f"   📊 Generated {len(chunks)} chunks")

            # Add chunks to collection
            for i, chunk in enumerate(chunks):
                try:
                    # Generate embedding
                    embedding = self.generate_embedding(chunk)

                    # Create chunk-specific metadata
                    chunk_metadata = metadata.copy()
                    chunk_metadata.update({
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "chunk_length": len(chunk),
                        "chunk_start": i * (len(chunk) - 150),  # Approximate position
                    })

                    # Add to collection
                    doc_id = f"{file_path.stem}_chunk_{i}_{int(time.time())}"

                    self.collection.add(
                        ids=[doc_id],
                        documents=[chunk],
                        embeddings=[embedding],
                        metadatas=[chunk_metadata]
                    )

                    result["chunks_added"] += 1

                except Exception as e:
                    print(f"   ❌ Error adding chunk {i}: {e}")
                    continue

            result["status"] = "completed"
            print(f"   ✅ Completed: {result['chunks_added']} chunks added")

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"   ❌ Error processing {file_path.name}: {e}")

        return result

    def process_directory(self, directory_path: str) -> Dict[str, Any]:
        """Process all documents in a directory."""
        directory = Path(directory_path)

        if not directory.exists():
            return {"error": f"Directory not found: {directory_path}"}

        # Find all text files
        file_patterns = ["*.txt", "*.md", "*.pdf"]
        files_to_process = []

        for pattern in file_patterns:
            files_to_process.extend(directory.rglob(pattern))

        if not files_to_process:
            return {"error": f"No supported files found in {directory_path}"}

        print(f"🔍 Found {len(files_to_process)} files to process")
        print(f"📂 Directory: {directory_path}")
        print(f"📚 Collection: {self.collection_name}")
        print("=" * 60)

        results = {
            "total_files": len(files_to_process),
            "processed": 0,
            "skipped": 0,
            "errors": 0,
            "total_chunks": 0,
            "file_results": []
        }

        for file_path in files_to_process:
            result = self.process_document(file_path)
            results["file_results"].append(result)

            if result["status"] == "completed":
                results["processed"] += 1
                results["total_chunks"] += result["chunks_added"]
            elif result["status"] == "skipped":
                results["skipped"] += 1
            else:
                results["errors"] += 1

        return results

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection."""
        try:
            count = self.collection.count()

            # Get sample metadata to analyze categories
            if count > 0:
                sample = self.collection.peek(limit=min(100, count))
                categories = {}
                sources = set()

                for metadata in sample['metadatas']:
                    cat = metadata.get('category', 'Unknown')
                    categories[cat] = categories.get(cat, 0) + 1
                    sources.add(metadata.get('source', 'Unknown'))

                return {
                    "total_documents": count,
                    "categories": categories,
                    "unique_sources": len(sources),
                    "collection_name": self.collection_name
                }
            else:
                return {"total_documents": 0, "message": "Collection is empty"}

        except Exception as e:
            return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Ingest SAP documents into ChromaDB")
    parser.add_argument("directory", help="Directory containing SAP documents")
    parser.add_argument("--collection", default="sap_policies", help="ChromaDB collection name")
    parser.add_argument("--data-path", default="./chroma_db_data", help="ChromaDB data directory")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    # Initialize ingester
    ingester = SAPDocumentIngester(
        data_path=args.data_path,
        collection_name=args.collection
    )

    print("🚀 Starting SAP Document Ingestion")
    print("=" * 50)

    # Process documents
    results = ingester.process_directory(args.directory)

    if "error" in results:
        print(f"❌ Error: {results['error']}")
        sys.exit(1)

    # Print results
    print("\n" + "=" * 50)
    print("📊 INGESTION RESULTS")
    print("=" * 50)
    print(f"📁 Total files found: {results['total_files']}")
    print(f"✅ Successfully processed: {results['processed']}")
    print(f"⏭️  Skipped: {results['skipped']}")
    print(f"❌ Errors: {results['errors']}")
    print(f"📚 Total chunks added: {results['total_chunks']}")

    # Get final statistics
    stats = ingester.get_collection_stats()
    print("\n📈 COLLECTION STATISTICS")
    print("=" * 30)
    print(f"📊 Total documents in collection: {stats.get('total_documents', 0)}")

    if 'categories' in stats:
        print("📂 Categories:")
        for category, count in stats['categories'].items():
            print(f"   • {category}: {count}")

    if 'unique_sources' in stats:
        print(f"📄 Unique sources: {stats['unique_sources']}")

    print("\n✅ Document ingestion completed!")
    print("🎯 Your ChromaDB is ready for vector search queries.")

if __name__ == "__main__":
    main()
