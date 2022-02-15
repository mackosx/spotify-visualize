const express = require("express");
const fetch = require("node-fetch");
const { URLSearchParams } = require("url");
const { generateRandomString } = require("./helpers");
const { client_id, client_secret, redirect_uri } = require("./constants");

const router = express.Router();

const stateKey = "spotify_auth_state";

router.get("/login", function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const params = new URLSearchParams({
    response_type: "code",
    client_id: client_id,
    scope: "user-read-private user-read-email user-library-read",
    redirect_uri: redirect_uri,
    state: state,
  });
  res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

router.get("/callback", (req, response) => {
  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    const params = new URLSearchParams({
      error: "state_mismatch",
    });
    response.redirect("/#" + params.toString());
  } else {
    response.clearCookie(stateKey);
    const form = new URLSearchParams({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    });
    const authOptions = {
      method: "POST",
      body: form,
      headers: {
        Authorization:
          "Basic " +
          new Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
      },
    };

    fetch("https://accounts.spotify.com/api/token", authOptions)
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        } else {
          const params = new URLSearchParams({
            error: "invalid_token",
          });
          response.redirect("/#" + params.toString());
        }
      })
      .then((data) => {
        const access_token = data.access_token;
        const refresh_token = data.refresh_token;

        // pass the token to the browser to make requests from there
        const params = new URLSearchParams({
          access_token: access_token,
          refresh_token: refresh_token,
        });
        response.redirect("/#" + params.toString());
      })
      .catch((err) => console.log(err));
  }
});

router.get("/refresh_token", (req, response) => {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh_token,
  });
  const authOptions = {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        new Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
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

module.exports = router;
