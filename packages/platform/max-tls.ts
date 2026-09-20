import https from 'node:https';
import tls from 'node:tls';
import {readFileSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';
import {requireThat} from '../domain/errors.ts';

// Applied only to the fixed-host MAX HTTPS request. Global/system trust is untouched.
export function maxTlsOptions():Pick<https.RequestOptions,'ca'|'rejectUnauthorized'> {
 const pem=readFileSync(new URL('../../certs/russian-trusted-root-ca.crt',import.meta.url),'utf8');
 // This digest covers only the public CA certificate, never a credential.
 requireThat(createHash('sha256').update(pem).digest('hex')==='936a43fea6e8e525bcc0f81acd9c3d21b4fc4b9b68acea7906d698005afc6504','MAX_CA_PIN_MISMATCH',503);
 const cert=new X509Certificate(pem);
 requireThat(cert.ca&&cert.subject===cert.issuer&&cert.verify(cert.publicKey)
  &&Date.parse(cert.validFrom)<=Date.now()&&Date.now()<Date.parse(cert.validTo),'MAX_CA_INVALID',503);
 return {ca:[...tls.rootCertificates,pem],rejectUnauthorized:true};
}
