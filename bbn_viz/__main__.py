"""CLI entry point: python -m bbn_viz input.json [-o output.html] [--title TITLE]"""

import argparse
import sys

from . import render_file


def main():
    parser = argparse.ArgumentParser(
        prog="bbn_viz",
        description="Generate a self-contained HTML page from a BBN JSON file.",
    )
    parser.add_argument("input", help="Path to BBN JSON file")
    parser.add_argument(
        "-o", "--output", default=None, help="Output HTML file (default: stdout)"
    )
    parser.add_argument(
        "--title", default="BBN Viewer", help="Page title (default: BBN Viewer)"
    )
    args = parser.parse_args()

    html = render_file(args.input, title=args.title)

    if args.output:
        with open(args.output, "w") as f:
            f.write(html)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(html)


if __name__ == "__main__":
    main()
