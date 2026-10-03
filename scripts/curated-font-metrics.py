"""Generate metrics from pinned original fonts; variable instances exist only in memory.
Run with fonttools 4.66.0 on PYTHONPATH; never rewrites distributed font files.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
manifest=json.loads(Path('public/fonts/manifest.json').read_text())
metrics={}
vertical={}
for f in manifest:
 variants={}
 for record in f['files']:
  name=record['file'];italic='Italic' in name or 'it28' in name
  weights=[400,700] if '[wght]' in name else [700 if 'Bold' in name else 400]
  for weight in weights:
   key=('Bold' if weight==700 else '')+('Italic' if italic else '') or 'Regular'
   variants[key]={'file':f"/fonts/{f['id']}/{name}",'weight':weight,'style':'italic' if italic else 'normal'}
   font=TTFont('public'+variants[key]['file'])
   if 'fvar' in font:font=instantiateVariableFont(font,{'wght':weight},inplace=True)
   units=font['head'].unitsPerEm
   vertical[f['id']+':'+key]={'ascent':font['OS/2'].sTypoAscender/units,'descent':-font['OS/2'].sTypoDescender/units}
   metrics[f['id']+':'+key]={str(c):round(font['hmtx'][g][0]/units,6) for c,g in font.getBestCmap().items()}
 f['variants']=variants
Path('src/fonts/vertical.json').write_text(json.dumps(vertical),encoding='utf8')
Path('src/fonts/library.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
Path('src/fonts/metrics.json').write_text(json.dumps(metrics,separators=(',',':')),encoding='utf8')
notices=['# Third-party fonts\n','Original font files are redistributed unchanged with their original OFL-1.1 licenses. Pinned Google Fonts revision: `23e54b51ddffbc7713c583748e3bd86f62b1fa4a`. No font binaries are renamed, subsetted or modified.\n','OFL permits bundling with software provided copyright and license accompany each copy; fonts are not sold separately. Reserved Font Names apply to modified fonts. See https://openfontlicense.org/ofl-faq/. Variable originals are retained without duplicate static files; the UI exposes only the weights/styles below.\n']
for f in manifest:
 notices += [f"## {f['name']}\n",f"{f['copyright']}\n",f"- Source: {f['source']}\n- License: SIL Open Font License 1.1 (OFL-1.1)\n- Variants: {', '.join(f['variants'])} (Regular/Italic 400, Bold/BoldItalic 700)\n- Resources and original license: `public/fonts/{f['id']}/` and `OFL.txt`\n- Original file checksums: `public/fonts/manifest.json`\n"]
notices += ['## Existing Liberation Sans\n','The existing Liberation Sans Regular, Bold, Italic and BoldItalic resources and license remain in `public/fonts/` for compatibility. They are available under System / Legacy in the picker. See the original bundled license in that folder.\n']
Path('THIRD_PARTY_FONTS.md').write_text('\n'.join(notices),encoding='utf8')
Path('public/fonts/THIRD_PARTY_FONTS.md').write_text('\n'.join(notices),encoding='utf8')
