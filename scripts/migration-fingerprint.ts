import {createHash} from 'node:crypto';

// Pinned to reviewed Git blobs at ae05e8f88d937c6c96972b3619dff383de706a4a.
// CRLF variants independently reproduced by the 2026-10-20 audit. 0004..0006
// already had eol=lf: no historical CRLF exception is granted for those files.
export const reviewedMigrationHashes:Record<string,{lf:string;crlf?:string}>= {
  "0001_foundation.sql": {
    "lf": "93bf79b9ff1323f842ca6eb7624c6f81163b65a75390bca5b2fa3eafbf20ea0c",
    "crlf": "ac3786d17bc26c236a3758581ec8eceb0702d664fdec62c855d50e4ce932690a"
  },
  "0002_integration.sql": {
    "lf": "2c713fbfd55cb228d215eb2de25d380391323e4ed2701a3d693c521e45972b88",
    "crlf": "aa8b9463feb1fa89a439554d471cc997d2a4848f61840bd90ac883cd3bc34131"
  },
  "0003_ui_journal.sql": {
    "lf": "79542a8a98c16ee412a8af69c38b0db806bafbd75a4d882300ef41a5b716e15d",
    "crlf": "8921707da9b6bdd96c816adb17d46dfa7668b25ea9af620afea8c3910f31cbf3"
  },
  "0004_t105_catalog.sql": {
    "lf": "d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e"
  },
  "0005_saved_occurrences.sql": {
    "lf": "d8ee7951ff03e719e06516fe43e992d9141b962897ba1b601b565acd700cc337"
  },
  "0006_max_destination_fencing.sql": {
    "lf": "75769aec2b34f4e937aa9cdab3b177a3177c0ebbdb530a9fec8de66fa899d8fc"
  },
  "0007_owner_product.sql": {
    "lf": "aa04012864de01f6b4fa43623af26a36a9f936a4a99c6004d0031aca8546e6cd",
    "crlf": "45b3eeb476c1ccf5932e2e24285f552b4c1895a1e207a6fa7761e5c781d36eb0"
  },
  "0008_povod_v2_ui.sql": {
    "lf": "bcbec9923ef567f3caec567998d49b3b4130587b3680ae51ba5a7d403c787397",
    "crlf": "6b2276d6f127e9bdbd47be59dbb26ce63b74f9a728101fb1f835da0c56b99dc2"
  },
  "0009_povod_v2_corrections.sql": {
    "lf": "8df9c7a13f7635ebe949c7f733e9aab84eb41df6c1120fd87ed9d31fac36fc53",
    "crlf": "323a3dc0dd5c7b95942fc4766b5c40146ff4dbbf4dc56ec4cc9cda0e24e61611"
  },
  "0010_friendship_pair_unique.sql": {
    "lf": "d9577cb554c383b7ada45c7ad4e5aded2a6a74ec882fb2af14a550b8df93db5e",
    "crlf": "896fffb4bf8826bbc7129ef1b8ec5be5cb1197128f09dae32dc9c7fde94e0d51"
  },
  "0011_friend_rejection_state.sql": {
    "lf": "1f908fbccb1c40231443837f88d90b9d6c298537c6a43fe301c7905df8c0dd33",
    "crlf": "5968ec2e2666ef3c2e30f29ad519e97c3fe113bd2ad06348866f73e25cdf64c0"
  },
  "0012_plan_presentation_changes.sql": {
    "lf": "90635b9554eef2e740272d73c46d2f8071f44432b4490b1d79c8578762560890",
    "crlf": "876e4cb114b51f606c235934f1b96a2e6d33ea77c32e4f4ccc4cafc7eac137f7"
  },
  "0013_max_destination_revocation.sql": {
    "lf": "3cee709f31257839f8aeced4ecb85163f348ad91b92f2f9ca127cd0994aa6bec",
    "crlf": "4a54e57614953410e3e47acfbf8f182596e66e2272e68c54cd09fff6d1593bee"
  },
  "0014_max_event_launch_refs.sql": {
    "lf": "dc0a15febb1b048b98ae3e0925944f2c0d3179621e0a6b59b966e5117e5aa1e4",
    "crlf": "c000d4b5275302c4690c50d56d18fc331ff531c5bcc94a134c9f8dc59b5da7a4"
  },
  "0015_max_notification_outbox.sql": {
    "lf": "9d5c7a371d2ce6ebfa776fc67520991b1f02e47543d049f35f3a173dc3f9b19a",
    "crlf": "ee22c5648662a7a89c4764f9341b0eca98db2bfce3ecace42f10040c3d3c1529"
  },
  "0016_preferences_version.sql": {
    "lf": "055da932651c6798a7f67041dbbbad9e1752fab0611e63dcf2bc87066245ebf8",
    "crlf": "d87e5a3b51571563be61873298b45139f34a0d326deb589b0670fd06edcf3f99"
  },
  "0017_notification_pagination.sql": {
    "lf": "677f81a9dbdfd411f3cd083afd8d1f33c3b776ca62f4479e4df2c93c22a1277f",
    "crlf": "9d17e4304a142d8cb99966fbad1498fc75b2bbffe5e57d66bc22ac213aa061ef"
  }
};

export function migrationFingerprint(file:string,bytes:Buffer){
 const mismatch=()=>{throw new Error('MIGRATION_HASH_MISMATCH:'+file.slice(0,4));};
 let text:string;
 try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{return mismatch();}
 // No BOM, bare CR, mixed LF/CRLF, or decoding replacement is permitted.
 if(text.includes('\uFEFF')||text.includes('\r')&&(/\r(?!\n)/.test(text)||/(?<!\r)\n/.test(text)))return mismatch();
 const body=text.replace(/\r\n/g,'\n');
 const sha256=createHash('sha256').update(body).digest('hex');
 const reviewed=reviewedMigrationHashes[file];
 if(reviewed&&(sha256!==reviewed.lf||text.includes('\r')&&!reviewed.crlf))return mismatch();
 return {body,sha256,accepts:(stored:string)=>stored===sha256||Boolean(reviewed?.crlf&&stored===reviewed.crlf)};
}
