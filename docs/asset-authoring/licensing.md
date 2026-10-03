# Source and license records

**OPTIONAL runtime fields:** `author` (≤240 characters), `source` and `license` (≤1,000 each) are plain strings. There is no required license, SPDX identifier, URL syntax, registry lookup or network fetch. Omission/null means absent; new assets default to empty. Explicit empty strings can clear values under Overwrite. Other metadata limits and character rules are in [package format](package-format.md).

Example provenance fields, to adapt to the actual creator and permission terms:

```json
{"author":"Jane Doe","source":"Original artwork by Jane Doe","license":"CC BY 4.0"}
```

This is an example of recording a license, not a recommendation to apply it. **RECOMMENDED:** name the creator, record original source, modifications and the exact applicable terms. For generated artwork, record that provenance accurately rather than presenting it as hand-painted. Check redistribution permission before including any image or font. Different assets can have different terms; a package-level readme does not override per-asset rights.

**RECOMMENDED distribution layout:** `LICENSE.txt` plus `notices/artist-name.txt` and a README explaining which files each notice covers. Extra safe files are permitted within package limits. Mapweaver ignores and does not retain/re-export them. Keep the original ZIP and redistribute required notices with any exported images yourself. Short per-asset source/license strings survive normal import/export and help recover attribution, but do not replace full notices where required.

**REQUIRED technical behavior:** supported fields and image validation must pass; the importer does not verify ownership or legal permission. A successful import or CLI result is not a legal guarantee.

The minimal templates use clearly identified original example artwork/CC0 Engraved artwork. The Painterly example copies its original author/source/license metadata and supplied usage notice. These example terms do not apply to replacement images you author or obtain elsewhere.
