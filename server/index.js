const express = require("express"); // Express web server framework
const fetch = require("node-fetch"); // fetchlibrary
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const { URLSearchParams } = require("url");

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri
if (!client_id || !client_secret || !redirect_uri) {
  throw new Error("Some env vars are not present. Check your config!");
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
function generateRandomString(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const stateKey = "spotify_auth_state";

const app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.get("/login", function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope = "user-read-private user-read-email user-library-read";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, response) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    response.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    response.clearCookie(stateKey);
    const form = new URLSearchParams();
    form.append("code", code);
    form.append("redirect_uri", redirect_uri);
    form.append("grant_type", "authorization_code");
    const authOptions = {
      method: "POST",
      body: form,
      headers: {
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    };

    fetch("https://accounts.spotify.com/api/token", authOptions)
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        } else {
          response.redirect(
            "/#" +
              querystring.stringify({
                error: "invalid_token",
              })
          );
        }
      })
      .then((data) => {
        const access_token = data.access_token;
        const refresh_token = data.refresh_token;

        const options = {
          method: "GET",
          headers: {
            Authorization: "Bearer " + access_token,
            "Content-Type": "application/json",
          },
        };

        // use the access token to access the Spotify Web API
        fetch("https://api.spotify.com/v1/me", options)
          .then((res) => res.json())
          .then((data) => {
            console.log(data);
          })
          .catch((err) => console.log(err));

        // we can also pass the token to the browser to make requests from there
        response.redirect(
          "/#" +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
            })
        );
      })
      .catch((err) => console.log(err));
  }
});

app.get("/refresh_token", function (req, response) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const form = new URLSearchParams();
  form.append("grant_type", "refresh_token");
  form.append("refresh_token", refresh_token);
  const authOptions = {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    body: form,
  };

  fetch("https://accounts.spotify.com/api/token", authOptions)
    .then((res) => {
      if (res.status === 200) {
        return res.json();
      }
    })
    .then((data) => {
      const access_token = data.access_token;
      response.send({
        access_token: access_token,
      });
    })
    .catch((err) => console.log(err));
});

console.log("Listening on 8888");
app.listen(8888);
