#!/usr/bin/env python3
"""Debug AST chunking for a file."""

import argparse
from pathlib import Path

import tree_sitter_languages


def debug_ast(file_path: str) -> None:
    """Parse and display AST for debugging chunker."""
    path = Path(file_path)
    if not path.exists():
        print(f"File not found: {file_path}")
        return

    content = path.read_text()
    extension = path.suffix.lstrip(".")

    # Map extensions to languages
    lang_map = {
        "py": "python",
        "js": "javascript",
        "ts": "typescript",
        "tsx": "tsx",
        "jsx": "javascript",
        "rs": "rust",
        "go": "go",
        "java": "java",
        "cpp": "cpp",
        "c": "c",
        "rb": "ruby",
    }

    language = lang_map.get(extension)
    if not language:
        print(f"Unsupported language for extension: {extension}")
        return

    parser = tree_sitter_languages.get_parser(language)
    tree = parser.parse(content.encode())

    def print_node(node, indent=0):
        """Recursively print AST nodes."""
        prefix = "  " * indent
        start_line = node.start_point[0] + 1
        end_line = node.end_point[0] + 1
        print(f"{prefix}{node.type} [{start_line}:{end_line}]")
        for child in node.children:
            print_node(child, indent + 1)

    print(f"AST for {file_path} ({language}):\n")
    print_node(tree.root_node)


def main() -> None:
    parser = argparse.ArgumentParser(description="Debug AST chunking")
    parser.add_argument("file", help="File to parse")
    args = parser.parse_args()

    debug_ast(args.file)


if __name__ == "__main__":
    main()
