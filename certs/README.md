# MAX-only public trust anchor

Source: https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt (official government distribution). Landing: https://www.gosuslugi.ru/landing/crt. MAX requirement: https://dev.max.ru/docs-api.

Retrieved 2026-09-20T15:41:34Z over default verified Windows Schannel HTTPS. Unchanged official PEM bytes match repository-owned T106 material at commit 5583772554bb196f6410ea4b3a90da55ba1e68eb. Its existing CA metadata test is reused; no third-party executable code is imported.

- Subject/issuer: C=RU, O=The Ministry of Digital Development and Communications, CN=Russian Trusted Root CA.
- Serial: 1000; self-signed RSA root, CA=true.
- Validity: 2022-03-01T21:04:15Z through 2032-02-27T21:04:15Z.
- Public PEM SHA-256: 936a43fea6e8e525bcc0f81acd9c3d21b4fc4b9b68acea7906d698005afc6504.
- Public DER SHA-256: D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31.

The issuer distributes this public trust material for installation. No software licence is asserted for the certificate; issuer/source notices are retained. No private key, leaf or intermediate is installed as a trust anchor.

packages/platform/max-tls.ts pins public bytes and checks CA constraints, signature and validity. It supplies this root plus Node bundled CAs only to MaxTransport's fixed-host HTTPS request. No NODE_EXTRA_CA_CERTS, global HTTPS agent, Windows trust store or Docker-wide trust setting is changed. Hostname/chain/signature/validity checks remain active; no new revocation guarantee is claimed.

scripts/copy-assets.mjs copies the root into dist/certs for the compiled runtime. The release Dockerfile copies only compiled dist (including this public root), SQL migrations, production dependencies, package metadata and licence notices. Docker execution is separately verified or explicitly marked unavailable in the handoff.

Rotation: verify current official MAX/issuer guidance, download through already verified HTTPS, review CA identity/constraints/validity and chain need, and deliberately update this record, helper pin and test. Never derive trust solely from a failed peer handshake. Rebuild and run offline tests plus verified TLS and missing-root/wrong-hostname negative controls.
