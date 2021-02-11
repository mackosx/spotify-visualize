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

function createChart(data, label = "Data", labels = []) {
  const ctx = document.getElementById("chart").getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          backgroundColor: "#4cdf53",
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "timeseries",
        },
      },
    },
  });
  return chart;
}

const params = getHashParams();

let accessToken = params.access_token;
const refreshToken = params.refresh_token;
const error = params.error;

if (error) {
  alert("There was an error during the authentication");
}

function updateToken() {
  fetch("/refresh_token", {
    method: "GET",
    body: {
      refresh_token: refreshToken,
    },
  }).then((data) => {
    const accessToken = data.access_token;
    document.querySelector("#data-placeholder").appendChild(accessToken);
    document.querySelector("#data-placeholder").appendChild(refreshToken);
  });
}

function setData(chart, data, label, labels) {
  chart.data.labels = labels;
  chart.data.datasets = [
    {
      label,
      data,
      backgroundColor: "#4cdf53",
    },
  ];
  chart.update();
}

const grabData = (chart) => () => {
  fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      }
    })
    .then((data) => {
      dates = data.items.map((song) => song.added_at);
      const freqMap = new Map();

      dates.forEach(function (time) {
        const date = new Date(time);
        const monthName = date.toLocaleString("en-us", {
          month: "short",
        });

        const key = monthName + "-" + date.getFullYear();
        let count = freqMap.get(key) || 0;
        freqMap.set(key, ++count);
      });

      setData(chart, [...freqMap.values()], "Library Save Date", [
        ...freqMap.keys(),
      ]);
    })
    .catch(console.log);
};

const chart = createChart();

const updateChart = grabData(chart);

document.querySelector("#get-data").addEventListener("click", updateChart);

if (accessToken) {
  document.querySelector("#login-button").remove();
}
