const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

if (!client_id || !client_secret || !redirect_uri) {
  throw new Error("Some env vars are not present. Check your config!");
}

module.exports = { client_id, client_secret, redirect_uri };
