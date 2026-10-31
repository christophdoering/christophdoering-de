"""Quadrat-Enden (ss09) in den Webfonts von christophdoering.de immer anwenden:
die ss09-Lookups werden zusätzlich in die Standard-Features ccmp und calt gehängt,
die jeder Browser ohne CSS-Angabe ausführt. ss09 selbst bleibt erhalten."""
import glob, sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot

for path in sorted(glob.glob(sys.argv[1] + '/*.woff2')):
    t = TTFont(path); g = t['GSUB'].table
    recs = g.FeatureList.FeatureRecord
    ss09 = [i for r in recs if r.FeatureTag == 'ss09' for i in r.Feature.LookupListIndex]
    done = False
    for r in recs:
        if r.FeatureTag in ('ccmp', 'calt'):
            r.Feature.LookupListIndex = sorted(set(r.Feature.LookupListIndex) | set(ss09)); done = True
    if not done:  # kein Standard-Feature vorhanden: calt neu anlegen und in alle Sprachsysteme eintragen
        fr = ot.FeatureRecord(); fr.FeatureTag = 'calt'; fr.Feature = ot.Feature()
        fr.Feature.FeatureParams = None; fr.Feature.LookupListIndex = list(ss09); fr.Feature.LookupCount = len(ss09)
        recs.append(fr); g.FeatureList.FeatureCount = len(recs); idx = len(recs) - 1
        for sr in g.ScriptList.ScriptRecord:
            for ls in [sr.Script.DefaultLangSys] + [l.LangSys for l in sr.Script.LangSysRecord]:
                if ls is not None: ls.FeatureIndex.append(idx); ls.FeatureCount = len(ls.FeatureIndex)
    for r in recs: r.Feature.LookupCount = len(r.Feature.LookupListIndex)
    t.flavor = 'woff2'; t.save(path)
    print(path.split('/')[-1], 'ss09-Lookups', ss09, 'neu angelegt' if not done else 'in ccmp/calt')
