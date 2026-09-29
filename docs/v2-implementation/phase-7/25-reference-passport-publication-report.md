# Phase 7 Reference Passport Publication Report

Status: **PASS**
Publication environment: **Hosted PreProd only**

Application deployment: `dpl_CjY6fVs8rJXv1qC2WUUnvpYQRKgR` (`READY`)
Immutable deployment URL: `https://greanlean-dpp-preprod-1jz39rdvu-songweinie-1175s-projects.vercel.app`
Stable alias: `https://greanlean-dpp-preprod.vercel.app`

All 22 Individual-level candidates passed the real V2 sequence:

`Candidate → Review → Approval → Publication → Immutable Version 1 → Current Pointer → Resolver`

The review submitter, reviewer, and publisher were separate synthetic PreProd identities. Registry submission was not performed.

## Publication ledger

| DPP ID | Version | Payload SHA-256 | Resolver |
| --- | ---: | --- | --- |
| DPP-GLR-EBIKE-000001 | 1 | `87c3c9660bbc5b06b5ab1b46ed66f429ec567204491ee9f840658e52d6992251` | PASS |
| DPP-GLR-EBIKE-000002 | 1 | `6bb1abc78e80cf0ce522ce0c494d60b5257fd47cc4771535eee3d3ee0e03aaf0` | PASS |
| DPP-GLR-EBIKE-000003 | 1 | `dfb8b742d4d4b667d502787466815b175656fbd4de0dd6366965d30012f07b0b` | PASS |
| DPP-GLR-EBIKE-000004 | 1 | `734786ffb801fc1c1eb6e83770bcde91296506983e942c3b71f0f6950d05ba9b` | PASS |
| DPP-GLR-EBIKE-000005 | 1 | `b767d5b88f96f9432db2c5955033b47f95c903b0d592cb8895badb4d05f0cc7c` | PASS |
| DPP-GLR-EBIKE-000006 | 1 | `6bf1f801ba3ca46d0d204db47388c3938cc65c446161e87b359b36a6f4ee7828` | PASS |
| DPP-GLR-EBIKE-000007 | 1 | `dbffd205c4c0057b2352208efead3e939e63cdc92ba3042dd5f1974e2b181d86` | PASS |
| DPP-GLR-EBIKE-000008 | 1 | `14dc6490d0f75a96656767b1d956e3868fda0754db68f3fbb2cda087c7715ecc` | PASS |
| DPP-GLR-EBIKE-000009 | 1 | `22226a064ad8bed771b374d6556cbe481772c044760994e207dd6b893eae3d69` | PASS |
| DPP-GLR-EBIKE-000010 | 1 | `4a46d68cba306ac6701989e21166f8e4f2e5b733d4a7a4104bce84acd8165b4d` | PASS |
| DPP-GLR-EBIKE-000011 | 1 | `d1f0345ed135e22f16d0de732f2a10a9b6c4ef1f3dbc7bec22b4ff4f838ea318` | PASS |
| DPP-GLR-EBIKE-000012 | 1 | `4f7785aa1ed3990b866500a7cf4ea056f978be992f194fe30cfcb28d6f873880` | PASS |
| DPP-GLR-EBIKE-000013 | 1 | `9335e1719679d9068947e0f9f53c4ec8e431f24c0344757ba6523d3ca4aa69af` | PASS |
| DPP-GLR-EBIKE-000014 | 1 | `b72fa74f3b4aaba5ae983091e1e984dc01aabfdb602f022320ede7e7761438be` | PASS |
| DPP-GLR-EBIKE-000015 | 1 | `e8e209a0e7f1f0a43569fbd6601cdd961eef5fe78f07d9650e2f1201d5ee6e1d` | PASS |
| DPP-GLR-EBIKE-000016 | 1 | `0a326a3952812742cb19c5d6afb2f02a39a4f0fc1751f0762e928a24f517f438` | PASS |
| DPP-GLR-EBIKE-000017 | 1 | `b1239f758bb5e84276729c4aa2af7f712e381482766fc22f23babff0082a7d9d` | PASS |
| DPP-GLR-EBIKE-000018 | 1 | `f1ff82fa1866e249e0c77261f2e0f12c6dbf6ec92f8e9595e2118282aac5e683` | PASS |
| DPP-GLR-EBIKE-000019 | 1 | `00cca5724c28e2f6acb5d6652f0cd2e4efe1b11c8bf8cdf9416dc42ff2cf66b2` | PASS |
| DPP-GLR-EBIKE-000020 | 1 | `694d416ece9fed1ad61c1ca53e28f30d9073e4daa8106b20c804f8b32a59cbe7` | PASS |
| DPP-GLR-EBIKE-000021 | 1 | `bf4851ce7a6dbf9faeb103526a43ebc72b4a259f3febdb9ea422a4b845e57496` | PASS |
| DPP-GLR-EBIKE-000022 | 1 | `e63a008e600634334e6dcecb893f124b049f25bbb22a96a08505388e27912379` | PASS |

## Resolver, QR and UI

- All 22 DPP IDs returned HTTP 200 and the matching immutable Version 1 payload hash.
- QR for `DPP-GLR-EBIKE-000001` returned a 320×320 PNG with the same DPP version and payload-hash headers.
- Public HTML contains `GreanLean Reference`, the DPP ID, and all three warnings: `SYNTHETIC DEMO DATA`, `NOT CUSTOMER VERIFIED`, and `NOT FOR REGULATORY DECLARATION`.
- The Backoffice authorised snapshot selects `GreanLean Reference Mobility` and reports the same catalog/import/publication counts.
- The Backoffice default-Tenant rule now prefers canonical Tenant code `greanlean-reference-mobility`; the former SOODOO name preference was removed and the new rule was deployed to Hosted PreProd.
- PUBLIC excludes BMS and internal policy/source details. Legitimate-interest, manufacturer, authority and internal boundaries remain enforced by the generic projection mechanism.

Preview:

- [First reference DPP](https://greanlean-dpp-preprod.vercel.app/p/DPP-GLR-EBIKE-000001)
- [First public JSON projection](https://greanlean-dpp-preprod.vercel.app/api/v2/resolver/DPP-GLR-EBIKE-000001?format=json)
- [First QR image](https://greanlean-dpp-preprod.vercel.app/api/v2/resolver/DPP-GLR-EBIKE-000001?format=qr)

Browser automation tooling timed out before it could capture a screenshot. The UI acceptance above is based on the Hosted HTML response, API projection, QR bytes/headers, and authenticated Backoffice snapshot; no screenshot evidence is claimed.

## Boundary confirmation

`REGISTRY_SUBMISSION_PERFORMED = NO`
`PRODUCTION_DATA_WRITE_PERFORMED = NO`
`PRODUCTION_TRAFFIC_SWITCHED = NO`
`PHASE_8_ENTERED = NO`
