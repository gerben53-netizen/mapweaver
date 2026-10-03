"""Extract unmodified bundled font advances; no shaping/system fonts at runtime."""
import struct, json
from pathlib import Path
result = {}
for variant in ['Regular', 'Bold', 'Italic', 'BoldItalic']:
    data = Path(f'public/fonts/LiberationSans-{variant}.ttf').read_bytes()
    def u16(offset): return struct.unpack_from('>H', data, offset)[0]
    def s16(offset): return struct.unpack_from('>h', data, offset)[0]
    tables = {}
    for i in range(u16(4)):
        tag, _, offset, length = struct.unpack_from('>4sIII', data, 12+i*16)
        tables[tag.decode()] = offset
    units = u16(tables['head']+18)
    metrics = u16(tables['hhea']+34)
    cmap = tables['cmap']
    mapping = {}
    for i in range(u16(cmap+2)):
        platform, encoding, offset = struct.unpack_from('>HHI', data, cmap+4+i*8)
        start = cmap+offset
        if platform != 3 or encoding != 1 or u16(start) != 4: continue
        count = u16(start+6)//2
        end = start+14
        begin = end+count*2+2
        delta = begin+count*2
        ranges = delta+count*2
        for j in range(count):
            for code in range(u16(begin+j*2), u16(end+j*2)+1):
                if code == 65535: continue
                ro = u16(ranges+j*2)
                glyph = u16(ranges+j*2+ro+(code-u16(begin+j*2))*2) if ro else code
                if glyph: glyph = (glyph+s16(delta+j*2)) % 65536
                if glyph: mapping[str(code)] = round(u16(tables['hmtx']+min(glyph,metrics-1)*4)/units, 6)
    result[variant] = mapping
Path('src/domain/fontMetrics.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf8')
