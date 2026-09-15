"""Check prepared iPhone definitions against the explicit Apple lineup checklist.

This is an offline coverage check, not a claim of live gallery readiness or
physical blank fit. Refresh iphone-lineup.json from Apple's model list when
expanding the supported generations or when Apple adds a new model.
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    lineup = json.loads((ROOT / 'pipeline/model-library/iphone-lineup.json').read_text())
    catalog = json.loads((ROOT / 'pipeline/model-library/catalog.json').read_text())['models']
    counts = Counter(m['slug'] for m in catalog)
    expected = [m['slug'] for m in lineup['models']]
    errors = []
    if len(set(expected)) != len(expected):
        errors.append('Duplicate entries in the iPhone checklist')
    for row in lineup['models']:
        slug = row['slug']
        # The original storefront model has its own legacy review package.
        original = slug == 'iphone-17-pro-max'
        if not original and counts[slug] != 1:
            errors.append(f'{slug}: expected one catalog study, found {counts[slug]}')
        geometry = ROOT / 'pipeline/blender/params' / f'{slug}.json'
        if not geometry.exists():
            errors.append(f'{slug}: missing geometry')
            continue
        params = json.loads(geometry.read_text())
        if params.get('slug') != slug:
            errors.append(f'{slug}: geometry belongs to a different model')
        if not original:
            entry = next((m for m in catalog if m['slug'] == slug), None)
            if entry and (ROOT / entry['geometryFile']).resolve() != geometry.resolve():
                errors.append(f'{slug}: catalog points at another geometry file')
    extras = sorted(s for s in counts if s.startswith('iphone-') and s not in expected)
    if extras:
        errors.append('iPhone studies missing from checklist: ' + ', '.join(extras))
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f"PASS: all {len(expected)} iPhone models have their own geometry definitions and catalog coverage.")
    print('Scope: ' + lineup['scope'])
    print('Checklist source checked on ' + lineup['checkedOn'] + ': ' + lineup['source'])


if __name__ == '__main__':
    main()
