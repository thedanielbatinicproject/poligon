import { Strategy as SamlStrategy, SamlConfig, Profile } from 'passport-saml';
import dotenv from 'dotenv';
import { OID } from './oid';
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
    id: profile[OID.eduPersonPrincipalName] || profile.nameID,
    email: profile[OID.email],
    givenName: profile[OID.givenName],
    sn: profile[OID.sn],
    displayName: profile[OID.displayName],
    affiliation: profile[OID.eduPersonAffiliation],
  };
  if (typeof done === 'function') {
    return done(null, user);
  }
});

// Function to generate SP metadata XML
export function generateMetadata(): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const entityID = process.env.SAML_ISSUER || `${baseUrl}/sp`;
  const callbackUrl = process.env.SAML_CALLBACK_URL || `${baseUrl}/auth/callback/aaieduhr`;
  const logoutUrl = process.env.SAML_LOGOUT_URL || `${baseUrl}/auth/logout/aaieduhr`;
  
  return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${entityID}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                  Location="${callbackUrl}"
                                  index="0"
                                  isDefault="true"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                             Location="${logoutUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

export { samlConfig };
export default samlStrategy;
