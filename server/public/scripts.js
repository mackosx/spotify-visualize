"use strict";
Chart.defaults.global.defaultFontFamily = "Nunito Sans";
let songData = [];
let chart;
let chartContainer;
/**
 * Obtains parameters from the hash of the URL.
 * @return {object} Dictionary of hash params to the values.
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
  chartContainer.style.display = "block";
  chart.data.labels = labels;
  chart.data.datasets = [
    {
      label: title,
      data,
      backgroundColor: "#17C3B2",
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
  }).then((response) => {
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
  });
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

/**
 * Returns a map of dates to occurences of saves.
 * @param {Array<object>} songs Spotify songs objects.
 * @param {"month"| "weekday" | "year" | "day"} grouping Level of frequency grouping.
 */
const mapFrequencies = (songs, grouping = "month") => {
  const dates = songs.map((song) => song.added_at);
  const freqMap = new Map();
  const weekDayKeys = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };

  if (grouping === "weekday") {
    // Set initial counts to 0 so map is sorted
    Object.values(weekDayKeys).forEach((v) => {
      freqMap.set(v, 0);
    });
  }

  dates.forEach((time) => {
    const date = new Date(time);
    let dateKey;
    switch (grouping) {
      case "weekday":
        dateKey = weekDayKeys[date.getDay()];
        break;
      case "day":
        dateKey = date.toLocaleString("en-us", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        });
        break;
      case "month":
        dateKey = date.toLocaleString("en-us", {
          month: "short",
          year: "2-digit",
        });
        break;
      case "year":
        dateKey = date.toLocaleString("en-us", {
          year: "numeric",
        });
        break;
    }

    let count = freqMap.get(dateKey) || 0;
    freqMap.set(dateKey, ++count);
  });
  return freqMap;
};

/**
 * Returns the frequency of each genre.
 * @param {Array<object>} songs Array of spotify song objects.
 */
const mapGenres = async (songs) => {
  const albumIds = songs.map((song) => song.track.album.id);
  const genres = [];
  const albums = await getAlbums(albumIds.slice(0, 20));
  albums.forEach((album) => genres.concat(album.genres));
  const freqMap = new Map();

  genres.forEach((genre) => {
    let count = freqMap.get(dateKey) || 0;
    freqMap.set(dateKey, ++count);
  });
  return freqMap;
};

/**
 * Returns an array of album objects.
 * @param {Array<string>} ids Array of album id strings to get.
 */
const getAlbums = async (ids) => {
  if (ids.length > 20) {
    throw new Error("Too many albums.");
  }
  const albumsResponse = await grabData(
    `https://api.spotify.com/v1/albums?ids=${ids.join(",")}`
  );
  return albumsResponse.albums;
};

async function byWeekDayListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, "weekday");
  setChartData(chart, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

async function byDayListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, "day");
  setChartData(chart, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

async function byMonthListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, "month");
  setChartData(chart, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

async function byYearListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, "year");
  setChartData(chart, [...mappedSongData.values()], "# of songs saved", [
    ...mappedSongData.keys(),
  ]);
}

async function byGenreListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = await mapGenres(songData);
  const chartElement = document.getElementById("chart");
  setChartData(chart, [...mappedSongData.values()], "Genre", [
    ...mappedSongData.keys(),
  ]);
}

// Move gathering data outside
// Add buttons to use different mapping functions on the data and call update data

// setChartData(chart, [...freqMap.values()], "Library Save Date", [...freqMap.keys()]);

document.querySelector("#by-genre").addEventListener("click", byGenreListener);
document
  .querySelector("#by-weekday")
  .addEventListener("click", byWeekDayListener);
document.querySelector("#by-day").addEventListener("click", byDayListener);
document.querySelector("#by-month").addEventListener("click", byMonthListener);
document.querySelector("#by-year").addEventListener("click", byYearListener);
document.querySelector("#by-year").addEventListener("click", byYearListener);

async function getSongData() {
  if (songData.length > 0) {
    return songData;
  }

  const initialCall = grabData(`https://api.spotify.com/v1/me/tracks`)
    .then((data) => {
      const totalSongs = data.total;
      const limit = 50;

      const songDataPromises = [];
      let offset = 0;
      const calls = Math.ceil(totalSongs / limit);
      for (let i = 0; i < calls; i++) {
        songDataPromises.push(
          grabData(
            `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`
          )
        );
        offset += limit;
      }
      Promise.all(songDataPromises).then((songSets) => {
        songSets.forEach((songSet) => {
          songData = songData.concat(songSet.items);
        });
      });
    })
    .catch((err) => {
      console.log("Couldnt get all song data");
    });
  return songData;
}

// Cache song data on load

if (accessToken) {
  getSongData();
  chartContainer = document.querySelector(".chart-container");
  const chartElement = document.getElementById("chart");
  chart = createChart(chartElement, {}, "", []);
  document.querySelector("#button-area").style.display = "block";
} else {
  document.querySelector("#login-button").style.display = "block";
}

// Ideas
// Audio features panel
