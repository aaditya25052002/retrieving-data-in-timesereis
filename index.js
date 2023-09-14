const express = require("express");
const mongoose = require("mongoose");
const app = express();
const fs = require("fs");
const path = require("path");

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

app.delete("/data/:type/:value", async (req, res) => {
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

  try {
    const dataToDelete = await TimeSeries.find({
      date: { $gte: start, $lt: end },
    });
    if (!dataToDelete.length) {
      res.status(404).send("No data to found to delete");
    }
    const filePath = path.join(
      __dirname,
      "backups",
      `backup_${Date.now()}.json`
    );

    fs.writeFile(
      filePath,
      JSON.stringify(dataToDelete, null, 2),
      async (err) => {
        if (err) {
          res.status(500).send("failed to load the backup data");
        }

        try {
          await TimeSeries.deleteMany({ date: { $gte: start, $lt: end } });
          res.send(
            `Data for the specified period ${type} = ${value} has been deleted.`
          );
        } catch (error) {
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    res.status(500).send("Error occurred while deleting data.");
  }
});

// DELETE data based on a specific time period
app.delete("/data", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .send("Both startDate and endDate query parameters are required.");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).send("Invalid startDate or endDate provided.");
  }

  // Fetch the data to be deleted
  const dataToDelete = await TimeSeries.find({
    date: { $gte: start, $lt: end },
  });

  // If no data to delete, return
  if (!dataToDelete.length) {
    return res.status(404).send("No data found for the given date range.");
  }

  // Save to local file
  const filePath = path.join(__dirname, "backups", `backup_${Date.now()}.json`);
  fs.writeFile(filePath, JSON.stringify(dataToDelete, null, 2), async (err) => {
    if (err) {
      return res.status(500).send("Failed to backup data.");
    }

    // If backup is successful, delete from database
    try {
      await TimeSeries.deleteMany({ date: { $gte: start, $lt: end } });
      res.send(
        `Data from ${startDate} to ${endDate} has been deleted and backed up to ${filePath}.`
      );
    } catch (error) {
      res.status(500).send("Error occurred while deleting data.");
    }
  });
});


// unix time format
app.post("/insert-unix", async (req, res) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0); // beginning of the day

  let measurements = [];
  for (let i = 0; i < 24; i++) {
    let currentTimestamp = new Date(today.getTime() + i * 3600 * 1000);
    measurements.push({
      timestamp: currentTimestamp,
      value: Math.random() * 100,
    });
  }

  const result = await TimeSeries.create({
    date: today.getTime(),  // storing in Unix timestamp format
    measurements,
  });

  console.log("Insert result:", result);
  res.send(measurements);
});


app.get("/data-unix/:type/:value", async (req, res) => {
  let type = req.params.type;
  let value = parseInt(req.params.value, 10);
  let start, end;

  switch (type) {
    case "year":
      start = new Date(value, 0, 1).getTime();
      end = new Date(value + 1, 0, 1).getTime();
      break;
    case "month":
      start = new Date(new Date().getFullYear(), value - 1, 1).getTime();
      end = new Date(new Date().getFullYear(), value, 1).getTime();
      break;
    case "week":
      start = new Date().getTime();
      start -= 7 * 24 * 3600 * 1000 * value;
      end = start + 7 * 24 * 3600 * 1000;
      break;
    case "day":
      start = new Date(new Date().getFullYear(), new Date().getMonth(), value).getTime();
      end = start + 24 * 3600 * 1000;
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
