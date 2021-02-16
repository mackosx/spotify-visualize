"use strict";
Chart.defaults.global.defaultFontFamily = "Nunito Sans";
let songData;
/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
  var hashParams = {};
  var e,
    r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while ((e = r.exec(q))) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

const params = getHashParams();

let accessToken = params.access_token;
const refreshToken = params.refresh_token;
const error = params.error;

if (error) {
  alert("There was an error during the authentication");
}

function createChart(element, data, title = "Data", labels = []) {
  const ctx = element.getContext("2d");
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: title,
          data: data,
          backgroundColor: "#17C3B2",
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "timeseries",
        },
      },
      maintainAspectRatio: false,
    },
  });
  return chart;
}

function setChartData(chart, data, title, labels) {
  chart.data.labels = labels;
  chart.data.datasets = [
    {
      label: title,
      data,
      backgroundColor: "#4cdf53",
    },
  ];
  chart.update();
}

const grabData = (url) => {
  let retries = 0;
  const maxRetries = 1;
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else if (response.status === 401) {
        response.json().then(async (data) => {
          if (data.error.message === "The access token expired") {
            await refreshTokens();
            return grabData(url);
          }
        });
      }
    })
    .catch(console.log);
};

function refreshTokens() {
  fetch(`/refresh_token?refresh_token=${refreshToken}`, {
    method: "GET",
  })
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      }
    })
    .then((data) => {
      accessToken = data.access_token;
    });
}

const mapFrequencies = (songs) => {
  const dates = songs.map((song) => song.added_at);
  const freqMap = new Map();

  dates.forEach((time) => {
    const date = new Date(time);
    const dateKey = date.toLocaleString("en-us", {
      // day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    // const keys = {
    //   0: "Sunday",
    //   1: "Monday",
    //   2: "Tuesday",
    //   3: "Wednesday",
    //   4: "Thursday",
    //   5: "Friday",
    //   6: "Saturday",
    // };
    // const dateKey = keys[date.getDay()];
    let count = freqMap.get(dateKey) || 0;
    freqMap.set(dateKey, ++count);
  });
  return freqMap;
};

const mapGenres = (songs) => {
  const dates = songs.map((song) => song.added_at);
  const freqMap = new Map();

  // dates.forEach((time) => {
  //   const date = new Date(time);
  //   const dateKey = date.toLocaleString("en-us", {
  //     // day: "2-digit",
  //     month: "short",
  //     year: "2-digit",
  //   });
  //   let count = freqMap.get(dateKey) || 0;
  //   freqMap.set(dateKey, ++count);
  // });
  return freqMap;
};

async function getDataListener(event) {
  songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData);
  document.querySelector(".chart-container").style.display = "block";
  const chartElement = document.getElementById("chart");
  createChart(chartElement, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

async function byGenreListener(event) {
  songData = (await getSongData()).reverse();
  const mappedSongData = mapGenres(songData);
  document.querySelector(".chart-container").style.display = "block";
  const chartElement = document.getElementById("chart");
  createChart(chartElement, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

// Move gathering data outside
// Add buttons to use different mapping functions on the data and call update data

// setChartData(chart, [...freqMap.values()], "Library Save Date", [...freqMap.keys()]);

document.querySelector("#get-data").addEventListener("click", getDataListener);
document.querySelector("#by-genre").addEventListener("click", byGenreListener);

async function getSongData() {
  if (songData) {
    return songData;
  }
  const songDataPromises = [];
  const limit = 50;
  const offset = 0;
  for (let i = 0; i < 3; i++) {
    offset += limit;
    songDataPromises.append(
      grabData(
        `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`
      )
    );
  }
  Promise.all(songDataPromises).then((songSets) => {
    songSets.forEach((songSet) => {
      songData.append(...songSet);
    });
  });
  return songData;
}

getSongData();

if (accessToken) {
  document.querySelector("#login-button").style.display = "none";
} else {
  document.querySelector("#get-data").style.display = "none";
}
