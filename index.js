const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json()); // for parsing JSON requests

const TimeSeriesSchema = new mongoose.Schema({
  date: Date, // represents the day the bucket starts
  measurements: [
    {
      timestamp: Date,
      value: Number,
    },
  ],
});

const TimeSeries = mongoose.model("TimeSeries", TimeSeriesSchema);

// Inserting dummy data
app.post("/insert-dummy", async (req, res) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0); // beginning of the day

  let measurements = [];
  for (let i = 0; i < 24; i++) {
    measurements.push({
      timestamp: new Date(today.getTime() + i * 3600 * 1000),
      value: Math.random() * 100,
    });
  }

  const result = await TimeSeries.create({ date: today, measurements });
  console.log("Insert result:", result);
  res.send(measurements);
});

// Fetch data based on year, month, week, or day
app.get("/data/:type/:value", async (req, res) => {
  let type = req.params.type;
  let value = parseInt(req.params.value, 10);
  let start, end;

  switch (type) {
    case "year":
      start = new Date(value, 0, 1);
      end = new Date(value + 1, 0, 1);
      break;
    case "month":
      start = new Date(new Date().getFullYear(), value - 1, 1);
      end = new Date(new Date().getFullYear(), value, 1);
      break;
    case "week":
      start = new Date();
      start.setDate(start.getDate() - 7 * value); // gets start of the week, assuming value is the week number of the year
      end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
      break;
    case "day":
      start = new Date(new Date().getFullYear(), new Date().getMonth(), value);
      end = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        value + 1
      );
      break;
    default:
      return res.status(400).send("Invalid type provided");
  }

  const data = await TimeSeries.find({ date: { $gte: start, $lt: end } });
  res.json(data);
});

mongoose
  .connect("mongodb://0.0.0.0:27017/Timeseries")
  .then(() => {
    app.listen(3000, () => console.log(`server running on port 3000`));
  })
  .catch((error) => {
    console.log(`${error} did not connect`);
  });
