/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  const ns = 'https://begreen.tm.ro';
  const email = (event.user.email || '').toLowerCase().trim();

  // ---------------------------------------------------------------------------
  // 1. 🎓 Auth0 Organizations for Campus & Corporate Carpool (UPT, UVT, Continental)
  // ---------------------------------------------------------------------------
  let orgName = event.organization?.display_name || null;
  if (!orgName) {
    if (email.endsWith('@student.upt.ro') || email.endsWith('@upt.ro')) {
      orgName = 'Universitatea Politehnica Timișoara (UPT)';
    } else if (email.endsWith('@e-uvt.ro') || email.endsWith('@uvt.ro')) {
      orgName = 'Universitatea de Vest din Timișoara (UVT)';
    } else if (email.endsWith('@continental.com') || email.endsWith('@continental.ro')) {
      orgName = 'Continental Automotive Timișoara';
    } else if (email.endsWith('@nokia.com')) {
      orgName = 'Nokia Campus Timișoara';
    } else if (email.endsWith('@primariatm.ro')) {
      orgName = 'Primăria Municipiului Timișoara';
    }
  }

  if (orgName) {
    api.idToken.setCustomClaim(`${ns}/org_name`, orgName);
    api.accessToken.setCustomClaim(`${ns}/org_name`, orgName);
  }

  // ---------------------------------------------------------------------------
  // 2. ♿ Auth0 Passkeys (WebAuthn) for Accessibility & Cyclists in the Field
  // ---------------------------------------------------------------------------
  const methods = event.authentication?.methods || [];
  const usedPasskey = methods.some(
    (m) =>
      m.name === 'passkey' ||
      m.name === 'webauthn-platform' ||
      m.name === 'webauthn-roaming'
  );
  api.idToken.setCustomClaim(`${ns}/passkey_verified`, usedPasskey);
  api.accessToken.setCustomClaim(`${ns}/passkey_verified`, usedPasskey);

  // ---------------------------------------------------------------------------
  // 3. 🛡️ GDPR Zero-Knowledge Age Verification (Protects Minors without Storing IDs)
  // ---------------------------------------------------------------------------
  // Computes only the legal AgeCategory inside Auth0; raw birth date is NEVER exposed to API
  const birthDateStr = event.user.user_metadata?.birth_date;
  let ageCategory = 'Adult';

  if (birthDateStr) {
    const dob = new Date(birthDateStr);
    if (!isNaN(dob.getTime())) {
      const ageDifMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);

      if (age < 14) {
        ageCategory = 'Under14'; // Romanian law forbids e-scooters
      } else if (age <= 15) {
        ageCategory = 'From14To15'; // Helmet legally mandatory
      }
    }
  }

  api.idToken.setCustomClaim(`${ns}/age_category`, ageCategory);
  api.accessToken.setCustomClaim(`${ns}/age_category`, ageCategory);

  // ---------------------------------------------------------------------------
  // 4. 🤖 Auth0 Bot Detection & Waze Citizen Trust Score
  // ---------------------------------------------------------------------------
  // Calculates trust score to prevent coupon farming and fake Waze hazard reports
  let trustScore = event.user.email_verified ? 55 : 25;
  if (orgName) trustScore += 25;
  if (usedPasskey) trustScore += 20;

  trustScore = Math.min(100, Math.max(0, trustScore));
  const wazeVoteWeight = trustScore >= 85 ? 3 : trustScore >= 65 ? 2 : 1;

  api.idToken.setCustomClaim(`${ns}/trust_score`, trustScore);
  api.accessToken.setCustomClaim(`${ns}/trust_score`, trustScore);
  api.idToken.setCustomClaim(`${ns}/waze_vote_weight`, wazeVoteWeight);
  api.accessToken.setCustomClaim(`${ns}/waze_vote_weight`, wazeVoteWeight);
};
