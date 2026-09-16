"""Build public derivatives only for an explicit approved-model snapshot.

Input: pipeline/out/storefront/approved.json exported from the current review DB.
No supplier photos, private originals or draft designs are copied into public/.
Only the three original presentation designs are allowlisted for this command.
"""
import argparse,json,subprocess,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
p=argparse.ArgumentParser();p.add_argument('slugs',nargs='*');a=p.parse_args()
models=json.loads((ROOT/'pipeline/out/storefront/approved.json').read_text())
designs=['meridian','static-bloom','low-tide']
manifest_file=ROOT/'src/lib/storefront/model-assets.json'
manifest=json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
sourcehash=hashlib.sha256(b''.join((ROOT/f'pipeline/artwork/source/{d}.png').read_bytes() for d in designs)).hexdigest()[:10]
for model in models:
 slug=model['slug']
 if a.slugs and slug not in a.slugs:continue
 assetkey=f"{model['version'][:12]}-{sourcehash}"
 if slug in manifest and manifest[slug]['version']==model['version'] and f'/{assetkey}/' in manifest[slug]['geometry'] and set(manifest[slug]['designs'])==set(designs) and all((ROOT/'public'/url.lstrip('/')).exists() for url in [manifest[slug]['geometry'],*[v for d in manifest[slug]['designs'].values() for v in d.values()]]):
  print(f'{slug}: existing derivatives verified',flush=True);continue
 params=model['geometry']
 if params.get('slug')!=slug:raise ValueError('Wrong geometry identity')
 folder=ROOT/'pipeline/out/storefront'/slug;folder.mkdir(parents=True,exist_ok=True)
 public=ROOT/'public/store/cases'/slug/assetkey;public.mkdir(parents=True,exist_ok=True)
 params_file=folder/'params.json';params_file.write_text(json.dumps(params,indent=2))
 textures=folder/'textures';textures.mkdir(exist_ok=True)
 width=round((params['width_mm']+2*params['depth_mm'])*10)
 height=round((params['height_mm']+2*params['depth_mm'])*10)
 base=f'/store/cases/{slug}/{assetkey}'
 entry={'version':model['version'],'geometry':f'{base}/shell.glb','templateAspect':width/height,'designs':{}}
 def run(label,cmd):
  print(f'{slug}: {label}',flush=True)
  with (folder/f'{label}.log').open('w') as log:subprocess.run(cmd,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,check=True)
 for d in designs:
  run('texture-'+d,['node','--input-type=module','-e',
   'import sharp from "sharp";const image=sharp(process.argv[1]).resize(Number(process.argv[4]),Number(process.argv[5]),{fit:"cover"}); await image.clone().png().toFile(process.argv[2]);await image.clone().webp({quality:92}).toFile(process.argv[3]);',
   str(ROOT/f'pipeline/artwork/source/{d}.png'),str(textures/f'{d}.png'),str(public/f'{d}-texture.webp'),str(width),str(height)])
 # Rebuild from the approved JSON rather than trusting an old .blend cache.
 run('build',[BLENDER,'-b','--python-exit-code','1','-P','pipeline/blender/build_shell.py','--','--params',str(params_file),'--texture',str(textures/'static-bloom.png'),'--out',str(folder/'shell.blend')])
 run('export',[BLENDER,'-b',str(folder/'shell.blend'),'--python-exit-code','1','-P','pipeline/blender/export_web.py','--','--out',str(public/'shell.glb')])
 run('stills',[BLENDER,'-b',str(folder/'shell.blend'),'--python-exit-code','1','-P','pipeline/blender/render_storefront.py','--','--textures',str(textures),'--out',str(folder)])
 for d in designs:
  entry['designs'][d]={'texture':f'{base}/{d}-texture.webp'}
  for camera,field in [('hero','hero'),('three_quarter','threeQuarter'),('flat','flat'),('detail','detail')]:
   run(f'webp-{d}-{camera}',['node','--input-type=module','-e','import sharp from "sharp";await sharp(process.argv[1]).webp({quality:90,alphaQuality:100}).toFile(process.argv[2]);',str(folder/f'{d}_{camera}.png'),str(public/f'{d}-{camera}.webp')])
   entry['designs'][d][field]=f'{base}/{d}-{camera}.webp'
 manifest[slug]=entry
 manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
 print(f'{slug}: ready',flush=True)
