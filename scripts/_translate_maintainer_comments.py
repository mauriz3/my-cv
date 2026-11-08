#!/usr/bin/env python3
"""One-off: translate Spanish maintainer comments via MyMemory (not for CI)."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_FILES = {'data/cv.es.ts', 'data/cv.en.ts'}
EXCLUDE_DIRS = {'node_modules', 'i18n', '.git', 'coverage', '.output', 'playwright-report', 'lighthouse-report', 'lighthouse-report-consent'}
GLOBS = ('*.ts', '*.vue', '*.mjs', '*.yml', '*.css', '*.sh', '*.cjs')
DIACRITICS = re.compile(r'[áéíóúñ¿¡]', re.I)
SPANISH_HINT = re.compile(
    r'\b(Lógica|lógica|Recorrido|Instantánea|Gráfica|gráfica|animaciones|especificación|móvil|escritorio|tarjeta|servidor|fichero|primera|última|según|también|página|Visitas|Privacidad|Cabecera|Despliegue|Comprobar|artefacto|producción|cobertura|unitarios)\b',
    re.I,
)


def list_files() -> list[Path]:
    out: list[Path] = []
    for pattern in GLOBS:
        for path in ROOT.rglob(pattern):
            rel = path.relative_to(ROOT).as_posix()
            if rel in EXCLUDE_FILES:
                continue
            if any(part in EXCLUDE_DIRS for part in path.parts):
                continue
            out.append(path)
    return sorted(out)


def is_comment_line(line: str, in_i18n: bool) -> bool:
    if in_i18n:
        return False
    s = line.lstrip()
    if s.startswith(('//', '*', '/*', '#', '<!--')):
        return True
    if re.match(r'\s*-\s*#', line):  # workflow comment after step
        return True
    if re.match(r'\s*(describe|it)\(', line):
        return True
    if re.match(r'\s*-\s*name:\s*', line) and DIACRITICS.search(line):
        return True
    if 'throw new Error' in line and needs_spanish(line):
        return True
    if '::error::' in line and needs_spanish(line):
        return True
    return False


def needs_spanish(line: str) -> bool:
    if DIACRITICS.search(line):
        return True
    return bool(SPANISH_HINT.search(line))


def translate(text: str, attempt: int = 0) -> str:
    q = urllib.parse.quote(text.strip()[:480])
    url = f'https://api.mymemory.translated.net/get?q={q}&langpair=es|en'
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = json.loads(response.read().decode())
        out = data.get('responseData', {}).get('translatedText', text)
        if 'MYMEMORY WARNING' in out.upper():
            if attempt < 3:
                time.sleep(2 + attempt)
                return translate(text, attempt + 1)
            return text
        return out
    except Exception:
        if attempt < 2:
            time.sleep(1)
            return translate(text, attempt + 1)
        return text


def preserve_indent(line: str, new_core: str) -> str:
    m = re.match(r'^(\s*)(//|/\*\*?|\*|#|<!--|-\s*name:)?\s*', line)
    if not m:
        return new_core
    indent = m.group(1) or ''
    prefix = m.group(2)
    if prefix is None:
        return indent + new_core
    if prefix == '*':
        return f'{indent}* {new_core.lstrip()}'
    if prefix.startswith('/*'):
        return f'{indent}{prefix} {new_core}'
    if prefix == '//':
        return f'{indent}// {new_core}'
    if prefix == '#':
        return f'{indent}# {new_core}'
    if prefix == '<!--':
        return f'{indent}<!-- {new_core} -->' if not new_core.endswith('-->') else f'{indent}<!-- {new_core}'
    if '- name:' in line:
        return re.sub(r'(name:\s*).+', rf"\1{new_core}", line) if 'name:' in line else line
    return indent + new_core


def transform_line(line: str, in_i18n: bool) -> tuple[str, bool]:
    if '<i18n' in line and not line.strip().startswith('//'):
        return line, True
    if '</i18n>' in line:
        return line, False
    if not is_comment_line(line, in_i18n) or not needs_spanish(line):
        return line, in_i18n
  # extract translatable text
    stripped = line.strip()
    core = stripped
    for lead in ('//', '/*', '*/', '*', '#', '<!--', '-->'):
        if core.startswith(lead):
            core = core[len(lead) :].strip()
    if core.endswith('*/'):
        core = core[:-2].strip()
    if core.endswith('-->'):
        core = core[:-3].strip()
    m = re.match(r'name:\s*(.+)', stripped)
    if m:
        core = m.group(1).strip().strip('"').strip("'")
    if not core or not needs_spanish(core):
        return line, in_i18n
    translated = translate(core)
    time.sleep(0.2)
    if stripped.startswith('*') and not stripped.startswith('*/'):
        indent = line[: len(line) - len(line.lstrip())]
        return f'{indent}* {translated}', in_i18n
    if stripped.startswith('//'):
        indent = line[: len(line) - len(line.lstrip())]
        return f'{indent}// {translated}', in_i18n
    if stripped.startswith('#'):
        indent = line[: len(line) - len(line.lstrip())]
        return f'{indent}# {translated}', in_i18n
    if 'name:' in stripped and m:
        return re.sub(r'(name:\s*).+', rf'\1{translated}', line), in_i18n
    if stripped.startswith('<!--'):
        indent = line[: len(line) - len(line.lstrip())]
        return f'{indent}<!-- {translated} -->', in_i18n
    if re.match(r'\s*(describe|it)\(', line):

        def repl(mo: re.Match[str]) -> str:
            inner = mo.group(2)
            if not needs_spanish(inner):
                return mo.group(0)
            time.sleep(0.2)
            return mo.group(1) + translate(inner) + mo.group(3)

        return re.sub(r"(\s*(?:describe|it)\s*\(\s*['\"`])([^'\"`]+)(['\"`])", repl, line, count=1), in_i18n
    if 'throw new Error' in line:

        def repl_err(mo: re.Match[str]) -> str:
            inner = mo.group(2)
            if not needs_spanish(inner):
                return mo.group(0)
            time.sleep(0.2)
            return mo.group(1) + translate(inner) + mo.group(3)

        return re.sub(r"(throw new Error\(`)([^`]+)(`\))", repl_err, line, count=1), in_i18n
    if '::error::' in line:

        def repl_ci(mo: re.Match[str]) -> str:
            inner = mo.group(1)
            if not needs_spanish(inner):
                return mo.group(0)
            time.sleep(0.2)
            return '::error::' + translate(inner)

        return re.sub(r'::error::(.+)', repl_ci, line, count=1), in_i18n
    return line.replace(core, translated, 1), in_i18n


def process_file(path: Path) -> bool:
    original = path.read_text(encoding='utf-8')
    in_i18n = False
    lines: list[str] = []
    changed = False
    for line in original.splitlines():
        new_line, in_i18n = transform_line(line, in_i18n)
        if new_line != line:
            changed = True
        lines.append(new_line)
    if changed:
        path.write_text('\n'.join(lines) + ('\n' if original.endswith('\n') else ''), encoding='utf-8')
    return changed


def main() -> None:
    changed_files = 0
    for path in list_files():
        if process_file(path):
            changed_files += 1
            print(path.relative_to(ROOT))
    print(f'Done. Modified {changed_files} files.')


if __name__ == '__main__':
    main()
