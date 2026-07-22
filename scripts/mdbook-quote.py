#!/usr/bin/env python3
"""
mdbook preprocessor: renders :::quote{...} container directives as styled quote boxes.

Mirrors the Remark plugin in src/plugins/remark-quote.js.

Syntax (3+ colons, open and close must use the same count):
    :::quote{author="maybe-yiyi" name="Yiyoung Liu" platform="codeberg"}
    "Good commit habits reflect on the developer."
    :::

Attributes:
    author    Codeberg/GitHub username (required)
    name      Display name (optional; defaults to author)
    platform  "codeberg" (default) or "github"

Output: a <figure class="doc-quote"> block with blockquote + avatar link.
"""
import json
import re
import sys

# Matches :::+quote{attrs}\ncontent\n:::+ (lazy content, DOTALL off so ^ works)
DIRECTIVE_RE = re.compile(
    r'^(?P<fence>:{3,})quote\{(?P<attrs>[^}]*)\}\s*\n'
    r'(?P<body>.*?)\n'
    r'(?P=fence)\s*$',
    re.MULTILINE | re.DOTALL,
)

ATTR_RE = re.compile(r'(\w+)=["\']([^"\']*)["\']')


def avatar_url(platform: str, author: str) -> tuple[str, str]:
    handle = author.lstrip('@')
    if platform == 'github':
        return (
            f'https://github.com/{handle}',
            f'https://github.com/{handle}.png?size=80',
        )
    return (
        f'https://codeberg.org/{handle}',
        f'https://codeberg.org/{handle}.png?size=80',
    )


def render_quote(attrs_str: str, body: str) -> str:
    attrs = dict(ATTR_RE.findall(attrs_str))
    author = attrs.get('author', '')
    platform = attrs.get('platform', 'codeberg')
    name = attrs.get('name', author.lstrip('@'))

    if not author:
        # Malformed directive — leave as-is
        return f':::quote{{{attrs_str}}}\n{body}\n:::'

    profile, avatar = avatar_url(platform, author)
    escaped_body = body.strip()

    return (
        f'<figure class="doc-quote">'
        f'<blockquote class="doc-quote__text">{escaped_body}</blockquote>'
        f'<a class="doc-quote__author" href="{profile}" target="_blank" '
        f'rel="noopener noreferrer" aria-label="{name} on {platform}">'
        f'<img class="doc-quote__avatar" src="{avatar}" alt="{name}" '
        f'width="40" height="40" loading="lazy" decoding="async">'
        f'</a>'
        f'</figure>'
    )


def process_content(content: str) -> str:
    return DIRECTIVE_RE.sub(
        lambda m: render_quote(m.group('attrs'), m.group('body')),
        content,
    )


def process_chapter(chapter: dict) -> None:
    chapter['content'] = process_content(chapter['content'])
    for item in chapter.get('sub_items', []):
        if 'Chapter' in item:
            process_chapter(item['Chapter'])


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == 'supports':
        sys.exit(0)

    context, book = json.load(sys.stdin)  # noqa: F841
    for item in book['items']:
        if 'Chapter' in item:
            process_chapter(item['Chapter'])
    print(json.dumps(book))


if __name__ == '__main__':
    main()
