import { Strategy as SamlStrategy, SamlConfig, Profile } from 'passport-saml';
import dotenv from 'dotenv';
dotenv.config();

const samlConfig: SamlConfig = {
  entryPoint: process.env.SAML_ENTRY_POINT!,
  issuer: process.env.SAML_ISSUER!,
  callbackUrl: process.env.SAML_CALLBACK_URL!,
  cert: process.env.SAML_CERT!,
  identifierFormat: null,
};

const samlStrategy = new SamlStrategy(samlConfig, (profile: any, done: any) => {
  const user = {
    id: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.6'] || profile.nameID,
    email: profile['urn:oid:0.9.2342.19200300.100.1.3'],
    givenName: profile['urn:oid:2.5.4.42'],
    sn: profile['urn:oid:2.5.4.4'],
    displayName: profile['urn:oid:2.16.840.1.113730.3.1.241'],
    affiliation: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'],
  };
  if (typeof done === 'function') {
    return done(null, user);
  }
});

export default samlStrategy;
