"""bbn_viz — Generate self-contained HTML pages from BBN JSON data."""

import json
from pathlib import Path

_ASSETS = Path(__file__).parent / "_assets"

_TEMPLATE = """\
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
<style>{css}</style>
</head>
<body>
<div id="root"></div>
<script>window.__BBN_DATA__ = {json_data};</script>
<script>{js}</script>
</body>
</html>
"""


def render(data, title="BBN Viewer"):
    """Render a BBN data dict to a self-contained HTML string."""
    css = (_ASSETS / "app.css").read_text()
    js = (_ASSETS / "app.js").read_text()
    json_data = json.dumps(data)
    return _TEMPLATE.format(title=title, css=css, js=js, json_data=json_data)


def render_file(json_path, title="BBN Viewer"):
    """Read a BBN JSON file and render to HTML string."""
    data = json.loads(Path(json_path).read_text())
    return render(data, title=title)


def save(data, output_path, title="BBN Viewer"):
    """Render a BBN data dict and write to an HTML file."""
    html = render(data, title=title)
    Path(output_path).write_text(html)


def save_file(json_path, output_path, title="BBN Viewer"):
    """Read a BBN JSON file and write a self-contained HTML file."""
    html = render_file(json_path, title=title)
    Path(output_path).write_text(html)
