/** Trust material is PUBLIC; this test performs no network call or credential access. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';
test('T106.1 packaged MAX root is the independently sourced pinned public CA',()=>{
 const bytes=readFileSync(new URL('../../certs/russian-trusted-root-ca.crt',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'936a43fea6e8e525bcc0f81acd9c3d21b4fc4b9b68acea7906d698005afc6504');
 const cert=new X509Certificate(bytes);assert.equal(cert.ca,true);assert.equal(cert.subject,cert.issuer);assert.equal(cert.verify(cert.publicKey),true);
 assert.equal(cert.serialNumber,'1000');assert.equal(cert.fingerprint256,'D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31');
 assert.ok(Date.parse(cert.validFrom)<=Date.now()&&Date.now()<Date.parse(cert.validTo));
 assert.equal((bytes.toString().match(/BEGIN CERTIFICATE/g)??[]).length,1);assert.ok(!bytes.toString().includes('PRIVATE KEY'));
});
