const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const router = require("./routes");

const app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.use("/", router);

console.log("Listening on 8888");
app.listen(8888);
