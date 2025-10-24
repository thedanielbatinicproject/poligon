import dotenv from 'dotenv';
dotenv.config();


export const OID = {
  email: process.env.AAI_OID_EMAIL || 'urn:oid:0.9.2342.19200300.100.1.3',
  givenName: process.env.AAI_OID_GIVENNAME || 'urn:oid:2.5.4.42',
  sn: process.env.AAI_OID_SN || 'urn:oid:2.5.4.4',
  displayName: process.env.AAI_OID_DISPLAYNAME || 'urn:oid:2.16.840.1.113730.3.1.241',
  eduPersonPrincipalName: process.env.AAI_OID_PRINCIPALNAME || 'urn:oid:1.3.6.1.4.1.5923.1.1.1.6',
  eduPersonAffiliation: process.env.AAI_OID_AFFILIATION || 'urn:oid:1.3.6.1.4.1.5923.1.1.1.1',
};
