"use strict";
Chart.defaults.global.defaultFontFamily = "Nunito Sans";
let songData = [];
let chart;
let chartElement;
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

function createBarChart(element, data, title = "Data", labels = []) {
  chartContainer.style.display = "block";
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

function createDoughnutChart(element, data, title = "Data", labels = []) {
  chartContainer.style.display = "block";
  const ctx = element.getContext("2d");
  const colors = data.map(() => {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  });
  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          label: title,
          data: data,
          backgroundColor: colors,
        },
      ],
    },
  });
  return chart;
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
  return fetch(`/refresh_token?refresh_token=${refreshToken}`, {
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

const timeListener = (frequency) => async (event) => {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, frequency);
  if (chart) {
    chart.destroy();
  }
  chart = createBarChart(
    chartElement,
    [...mappedSongData.values()],
    "# of songs saved",
    [...mappedSongData.keys()]
  );
};

const weekDayListener = (frequency) => async (event) => {
  const songData = (await getSongData()).reverse();
  const mappedSongData = mapFrequencies(songData, frequency);
  if (chart) {
    chart.destroy();
  }
  chart = createDoughnutChart(
    chartElement,
    [...mappedSongData.values()],
    "# of songs saved",
    [...mappedSongData.keys()]
  );
};

async function byGenreListener(event) {
  const songData = (await getSongData()).reverse();
  const mappedSongData = await mapGenres(songData);
  if (chart) {
    chart.destroy();
  }
  chart = createBarChart(chartElement, [...mappedSongData.values()], "Genre", [
    ...mappedSongData.keys(),
  ]);
}

// Move gathering data outside
// Add buttons to use different mapping functions on the data and call update data
document.querySelector("#by-genre").addEventListener("click", byGenreListener);
document
  .querySelector("#by-weekday")
  .addEventListener("click", weekDayListener("weekday"));
document
  .querySelector("#by-day")
  .addEventListener("click", timeListener("day"));
document
  .querySelector("#by-month")
  .addEventListener("click", timeListener("month"));
document
  .querySelector("#by-year")
  .addEventListener("click", timeListener("year"));

async function getSongData() {
  if (songData.length > 0) {
    return songData;
  }

  grabData(`https://api.spotify.com/v1/me/tracks`)
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
  chartElement = document.getElementById("chart");
  document.querySelector("#button-area").style.display = "block";
} else {
  document.querySelector("#login-button").style.display = "block";
}

document.querySelectorAll("button.toggle").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("toggled");
  });
});

// Ideas
// Audio features panel https://developer.spotify.com/documentation/web-api/reference/#/operations/get-several-audio-features

/**
 * TODO:
 * 1. Add bundler and split into separate files
 * 2. Improve styling
 * 3. Add some simple analysis
 */
