# POVOD state artwork placeholders

`povod-empty-magnifier.png` and `povod-error-cable.png` are deterministic temporary raster assets derived from the approved internal **POVOD Master UI Reference v1** state pack.

- Immutable source: `03_povod_ui_pack_states_4screens.png`
- Source SHA-256: `7FF1046935A0246856A9EAB8DCB0920241DDCFA6A96FE97A55FBC96BD15B2053`
- Empty crop: `x=500, y=270, width=260, height=215`
- Error crop: `x=900, y=285, width=300, height=180`
- Cleanup: deterministic edge-background transparency only
- External imagery: none

The file paths are a replaceable asset boundary. A designer can replace these PNGs with exact approved SVGs without changing the state components.

Regenerate on Windows with:

```powershell
.\scripts\extract-povod-state-assets.ps1 -SourcePath <path-to-approved-reference>
```
