"""Check the explicit Samsung preparation scope against local model definitions.

Offline coverage only: no claim of gallery readiness, blank availability or fit.
Refresh samsung-lineup.json when expanding the selected range.
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    lineup = json.loads((ROOT / 'pipeline/model-library/samsung-lineup.json').read_text())
    catalog = json.loads((ROOT / 'pipeline/model-library/catalog.json').read_text())['models']
    counts = Counter(m['slug'] for m in catalog)
    expected = [m['slug'] for m in lineup['models']]
    errors = []
    if len(set(expected)) != len(expected):
        errors.append('Duplicate entries in the Samsung checklist')
    for row in lineup['models']:
        slug = row['slug']
        if counts[slug] != 1:
            errors.append(f'{slug}: expected one catalog study, found {counts[slug]}')
        geometry = ROOT / 'pipeline/blender/params' / f'{slug}.json'
        if not geometry.exists():
            errors.append(f'{slug}: missing geometry')
            continue
        params = json.loads(geometry.read_text())
        if params.get('slug') != slug:
            errors.append(f'{slug}: geometry belongs to a different model')
        entry = next((m for m in catalog if m['slug'] == slug), None)
        if entry and (ROOT / entry['geometryFile']).resolve() != geometry.resolve():
            errors.append(f'{slug}: catalog points at another geometry file')
    extras = sorted(s for s in counts if s.startswith('galaxy-') and s not in expected)
    if extras:
        errors.append('Samsung studies missing from checklist: ' + ', '.join(extras))
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'PASS: all {len(expected)} Samsung models have their own geometry definitions and catalog coverage.')
    print('Scope: ' + lineup['scope'])
    print('Checklist checked on ' + lineup['checkedOn'])


if __name__ == '__main__':
    main()
