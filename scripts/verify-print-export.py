#!/usr/bin/env python3
"""Independently audit generated 3MF and Bambu/Orca round trips.
Usage: python3 scripts/verify-print-export.py source.3mf [roundtrip.3mf ...]
Standard library only. No slicer, repair, scaling or scene conversion is performed.
"""
import collections
import json
import math
import sys
import zipfile
import xml.etree.ElementTree as ET

C = '{http://schemas.microsoft.com/3dmanufacturing/core/2015/02}'
P = '{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}'
R = '{http://schemas.openxmlformats.org/package/2006/relationships}'
IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]


def apply(point, transform):
    return [sum(point[j] * transform[j * 3 + i] for j in range(3)) + transform[9 + i] for i in range(3)]


def audit(path):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, 'ZIP CRC failure'
        files = {name: archive.read(name) for name in archive.namelist()}
    for name, content in files.items():
        if name.endswith(('.xml', '.rels', '.model')):
            ET.fromstring(content)
    relations = ET.fromstring(files['_rels/.rels'])
    model_path = next(r.attrib['Target'].lstrip('/') for r in relations if r.attrib['Type'].endswith('/3dmodel'))
    assert model_path in files
    models = {name: ET.fromstring(content) for name, content in files.items() if name.endswith('.model')}
    resources = {}
    triangles = 0
    for name, model in models.items():
        assert model.attrib.get('unit', 'millimeter') == 'millimeter', name
        for obj in model.findall(f'{C}resources/{C}object'):
            key = (name, obj.attrib['id'])
            assert key not in resources
            resources[key] = obj
            mesh = obj.find(f'{C}mesh')
            if mesh is None:
                continue
            vertices = [[float(v.attrib[k]) for k in ('x', 'y', 'z')] for v in mesh.find(f'{C}vertices')]
            faces = [[int(t.attrib[k]) for k in ('v1', 'v2', 'v3')] for t in mesh.find(f'{C}triangles')]
            assert vertices and faces and all(math.isfinite(v) for p in vertices for v in p)
            edges = collections.Counter()
            for face in faces:
                assert len(set(face)) == 3 and all(0 <= i < len(vertices) for i in face)
                a, b, c = [vertices[i] for i in face]
                u, v = [[p[i] - a[i] for i in range(3)] for p in (b, c)]
                assert any(u[(i+1)%3]*v[(i+2)%3] != u[(i+2)%3]*v[(i+1)%3] for i in range(3)), (name, obj.attrib['id'], 'zero area')
                for i in range(3):
                    edges[(face[i], face[(i+1)%3])] += 1
            assert all(count == 1 and edges[(b, a)] == 1 for (a, b), count in edges.items()), (name, obj.attrib['id'], 'open or inconsistent edges')
            triangles += len(faces)

    palette = json.loads(files['Metadata/project_settings.config'])['filament_colour']
    config = ET.fromstring(files['Metadata/model_settings.config'])
    settings = {obj.attrib['id']: obj for obj in config.findall('object')}
    def metadata(node):
        return {m.attrib['key']: m.attrib['value'] for m in node.findall('metadata') if 'key' in m.attrib}

    def points(name, object_id, ancestors=()):
        key = (name, object_id)
        assert key not in ancestors, 'component cycle'
        obj = resources[key]
        mesh = obj.find(f'{C}mesh')
        if mesh is not None:
            return [[float(v.attrib[k]) for k in ('x', 'y', 'z')] for v in mesh.find(f'{C}vertices')]
        result = []
        for child in obj.find(f'{C}components'):
            child_path = child.attrib.get(P+'path', name).lstrip('/')
            matrix = list(map(float, child.attrib.get('transform', ' '.join(map(str, IDENTITY))).split()))
            assert len(matrix) == 12
            result.extend(apply(p, matrix) for p in points(child_path, child.attrib['objectid'], (*ancestors, key)))
        return result

    records = {}
    for item in models[model_path].find(f'{C}build'):
        object_id = item.attrib['objectid']
        setting = settings[object_id]
        info = metadata(setting)
        assert info['name'] not in records, 'duplicate physical name'
        verts = points(model_path, object_id)
        # Dimensions independent of slicer recentering, but including object orientation.
        matrix = list(map(float, item.attrib.get('transform', ' '.join(map(str, IDENTITY))).split()))
        verts = [apply(p, matrix) for p in verts]
        size = [max(p[i] for p in verts) - min(p[i] for p in verts) for i in range(3)]
        volumes = []
        for part in setting.findall('part'):
            data = metadata(part)
            slot = int(data.get('extruder', info.get('extruder', '1'))) - 1
            assert 0 <= slot < len(palette), (info['name'], 'invalid filament slot', slot)
            stat = part.find('mesh_stat')
            if stat is not None:
                for k in ('edges_fixed', 'degenerate_facets', 'facets_removed', 'facets_reversed', 'backwards_edges'):
                    assert int(stat.attrib.get(k, 0)) == 0, (info['name'], data['name'], k)
            volumes.append((data['name'], palette[slot].upper()))
        records[info['name']] = {'size': size, 'volumes': volumes}
    summary = {'file': path, 'objects': len(records), 'volumes': sum(len(r['volumes']) for r in records.values()), 'triangles': triangles, 'palette': palette, 'unit': 'millimeter'}
    print(json.dumps(summary))
    return summary, records


baseline_summary, baseline = audit(sys.argv[1])
for path in sys.argv[2:]:
    summary, actual = audit(path)
    assert actual.keys() == baseline.keys(), 'physical object identity/count changed'
    assert summary['triangles'] == baseline_summary['triangles'], 'triangle count changed'
    for name in baseline:
        assert collections.Counter(actual[name]['volumes']) == collections.Counter(baseline[name]['volumes']), (name, 'volume names/colors changed')
        assert all(abs(a-b) < 0.01 for a,b in zip(actual[name]['size'], baseline[name]['size'])), (name, 'dimensions/orientation changed')
    print('PASS: identities, colors, volumes, triangles and mm dimensions match source; no reported mesh repairs')
