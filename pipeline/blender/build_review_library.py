"""Local operator: build/check/render researched models without changing storefront assets.

Run with system Python, not Blender. Requires Blender, pnpm and the checked-in
artwork. Source images stay under placeholder/; review output stays under out/.
Human visual inspection must happen before importing the resulting packages.
"""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('slugs', nargs='*')
    parser.add_argument('--blender', default='/Applications/Blender.app/Contents/MacOS/Blender')
    args = parser.parse_args()
    catalog = json.loads((ROOT/'pipeline/model-library/catalog.json').read_text())
    models = [m for m in catalog['models'] if not args.slugs or m['slug'] in args.slugs]
    if not models or set(args.slugs)-{m['slug'] for m in models}:
        raise ValueError('Unknown model slug')
    failed = []
    for model in models:
        slug = model['slug']
        folder = ROOT/'pipeline/out/model-library'/slug
        folder.mkdir(parents=True, exist_ok=True)
        p = json.loads((ROOT/model['geometryFile']).read_text())
        width = int((p['width_mm']+2*p['depth_mm'])*10)
        height = int((p['height_mm']+2*p['depth_mm'])*10)
        def run(name, command):
            print(f'{slug}: {name}', flush=True)
            with (folder/(name+'.log')).open('w') as log:
                subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)
        try:
            (folder/'textures').mkdir(exist_ok=True)
            run('checker', ['pnpm', 'exec', 'tsx', 'pipeline/scripts/uv-checker.ts', str(folder/'textures/checker.png'), str(width), str(height), '190', slug])
            # Crop to cover while preserving image proportions, never stretch.
            run('artwork', ['node', '--input-type=module', '-e',
                'import sharp from "sharp"; await sharp(process.argv[1]).resize(Number(process.argv[3]),Number(process.argv[4]),{fit:"cover"}).png().toFile(process.argv[2]);',
                str(ROOT/'pipeline/artwork/source/static-bloom.png'), str(folder/'textures/artwork.png'), str(width), str(height)])
            blend = str(folder/'shell.blend')
            run('build', [args.blender, '-b', '--python-exit-code', '1', '-P', 'pipeline/blender/build_shell.py', '--', '--out', blend, '--params', model['geometryFile'], '--texture', str(folder/'textures/checker.png')])
            run('validate', [args.blender, '-b', blend, '--python-exit-code', '1', '-P', 'pipeline/blender/validate_shell.py'])
            render = [args.blender, '-b', blend, '--python-exit-code', '1', '-P', 'pipeline/blender/render.py', '--', '--designs', str(folder/'textures'), '--samples', '32']
            run('neutral', render + ['--only', 'checker', '--out', str(folder/'neutral'), '--surface-color', '#9caaa5', '--cameras', 'hero', 'three_quarter', 'flat', 'detail', 'interior', 'side', 'bottom'])
            run('proof', render + ['--out', str(folder/'proof'), '--cameras', 'flat', 'three_quarter'])
            (folder/'completed.json').write_text(json.dumps({'slug':slug,'geometry':model['geometryFile'],'digital_checks':'passed','visual_review':'pending'},indent=2)+'\n')
            print(f'{slug}: digital checks passed; 11 review images rendered', flush=True)
        except subprocess.CalledProcessError as error:
            failed.append(slug)
            print(f'{slug}: FAILED ({error.returncode}); inspect logs in {folder}', flush=True)
    if failed:
        raise SystemExit('Failed models: '+', '.join(failed))


if __name__ == '__main__':
    main()
