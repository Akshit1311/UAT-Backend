const express = require("express");
const router = express.Router();
const request = require("request");
const mongodb = require("../mongodb");
const _ = require("lodash");
const ObjectId = require("mongodb").ObjectId;

router.get("/industryInsights", async (req, resp) => {
  //This Api returns insights i.e. industry wise counts and their percentages
  let stateId = "";
  if (!_.isEmpty(req.query.stateId)) {
    stateId = new ObjectId(req.query.stateId);
  }
  // let totalCount = await getTotalCount(stateId);
  let industryWiseCounts = await getIndustryWiseCounts(stateId);

  let output = [];
  industryWiseCounts.forEach((e) => {
    // let percentage = (totalCount)? (e.count*100/totalCount).toFixed(2):0;
    if (e._id !== null && e._id != "") {
      output.push({ industry: e._id, count: e.count, percentage: 0 });
    }
  });
  resp.send(output);
});

//Get Sector insights
router.get("/sectorInsights", async (req, resp) => {
  let stateId = "";
  if (!_.isEmpty(req.query.stateId)) {
    stateId = new ObjectId(req.query.stateId);
  }
  // let totalSectorCount = await getTotalSectorCount(stateId);
  let sectorWiseCounts = await getSectorWiseCounts(stateId);
  let output = [];
  sectorWiseCounts.forEach((e) => {
    // let percentage = totalSectorCount
    //   ? ((e.count * 100) / totalSectorCount).toFixed(2)
    //   : 0;
    if (e._id !== null && e._id != "") {
      output.push({ sector: e._id, count: e.count, percentage: 0 });
    }
  });
  resp.send(output);
});

//Get Stage insights
router.get("/stageInsights", async (req, resp) => {
  //This Api returns insights i.e. sector wise counts and their percentages
  let stateId = "";
  if (!_.isEmpty(req.query.stateId)) {
    stateId = new ObjectId(req.query.stateId);
  }

  // let totalStageCount = await getTotalStageCount(stateId);
  let stageWiseCounts = await getStageWiseCounts(stateId);
  let output = [];
  stageWiseCounts.forEach((e) => {
    // let percentage = totalStageCount
    //   ? ((e.count * 100) / totalStageCount).toFixed(2)
    //   : 0;
    if (e._id !== null && e._id != "") {
      output.push({ stage: e._id, count: e.count, percentage: 0 });
    }
  });
  resp.send(output);
});

async function getTotalCount(stateId = "") {
  let matchQuery = { role: "Startup", dpiitCertified:true, "industry.name": { $ne: "" } };
  if (stateId != "") {
    matchQuery = { role: "Startup", dpiitCertified:true, stateId: { $eq: stateId }, "industry.name": { $ne: "" } };
  }
  const queryTotalIndCount = [
    { $unwind: { path: "$industry" } },
    { $match: matchQuery },
    { $group: { _id: null, count: { $sum: 1 } } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(queryTotalIndCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0].count;
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function getTotalSectorCount(stateId = "") {
  let matchQuery = { role: "Startup", dpiitCertified:true, "sector.name": { $ne: "" } };
  if (stateId != "") {
    matchQuery = { role: "Startup", dpiitCertified:true, stateId: { $eq: stateId }, "sector.name": { $ne: "" } };
  }
  const queryTotalSectorCount = [
    { $unwind: { path: "$sector" } },
    { $match: matchQuery },
    { $group: { _id: null, count: { $sum: 1 } } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(queryTotalSectorCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0].count;
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function getTotalStageCount(stateId = "") {
  if (stateId != "") {
    matchQuery = { role: "Startup", dpiitCertified:true,stateId: stateId, stage: { $ne: null } };
  } else {
    matchQuery = { role: "Startup", dpiitCertified:true, stage: { $ne: null } };
  }

  const queryTotalStageCount = [
    { $match: matchQuery },
    { $group: { _id: null, count: { $sum: 1 } } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(queryTotalStageCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0].count;
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function getIndustryWiseCounts(stateId = "") {
  let matchQuery = { role: "Startup", dpiitCertified:true,"industry.name": { $exists: true } };
  if (stateId != "") {
    matchQuery = {
      role: "Startup", dpiitCertified:true,
      stateId: stateId,
      "industry.name": { $exists: true },
    };
  }
  const queryIndwiseCount = [
    { $unwind: { path: "$industry" } },
    { $match: matchQuery },
    { $group: { _id: "$industry.name", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(queryIndwiseCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result;
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function getSectorWiseCounts(stateId = "") {
  let matchQuery = { role: "Startup", dpiitCertified:true };
  if (stateId != "") {
    matchQuery = { role: "Startup", dpiitCertified:true, stateId: stateId };
  }
  const querySectorwiseCount = [
    { $unwind: { path: "$sector" } },
    { $match: matchQuery },
    { $group: { _id: "$sector.name", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(querySectorwiseCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result;
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function getStageWiseCounts(stateId = "") {
  let matchQuery = { role: "Startup" , dpiitCertified:true};
  if (stateId != "") {
    matchQuery = { role: "Startup", dpiitCertified:true, stateId: stateId};
  }

  const queryStagewiseCount = [
    { $match: matchQuery },
    { $group: { _id: "$stage", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(queryStagewiseCount)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result;
          resolve(output);
        });
    } catch (err) {
      console.error("toNumbers :: " + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

router.get("/:geographicalEntity/:entityId/:from/:to", (req, resp) => {
  // #swagger.tags = ['Insights']
  // #swagger.path = '/insight/{geographicalEntity}/{entityId}/{from}/{to}'
  // #swagger.description = 'Insights'

  var output = {};
  output.from = req.params.from;
  output.to = req.params.to;

  var stateWiseCount = fs.readFileSync("./static/stateWiseCount.json", "utf8");
  stateWiseCount = JSON.parse(stateWiseCount);
  var indiaWiseCount = fs.readFileSync("./static/IndiaWiseCount.json", "utf8");
  indiaWiseCount = JSON.parse(indiaWiseCount);

  if (req.params.geographicalEntity == "country") {
    // India level
    console.log("Getting insights for India");
    var indArr = [];
    for (const industry of indiaWiseCount.industry) {
      industry.percentage = Math.round(
        (industry.count / indiaWiseCount.TotalIndustry) * 100
      );
      indArr.push(industry);
    }
    output.industry = indArr;

    var secArr = [];
    for (const sector of indiaWiseCount.sector) {
      sector.percentage = Math.round(
        (sector.count / indiaWiseCount.TotalSector) * 100
      );
      secArr.push(sector);
    }
    output.sector = secArr;

    var stgArr = [];
    for (const stage of indiaWiseCount.stage) {
      stage.percentage = Math.round(
        (stage.count / indiaWiseCount.TotalStage) * 100
      );
      stgArr.push(stage);
    }
    output.stage = stgArr;

    resp.send(output);
  } else if (req.params.geographicalEntity == "state") {
    // State level
    console.log("Getting insights for State with Id - " + req.params.entityId);
    var stateDetails = stateWiseCount[req.params.entityId];

    var indArr = [];
    for (const industry of stateDetails.industry) {
      industry.percentage = Math.round(
        (industry.count / stateDetails.TotalIndustry) * 100
      );
      var industryOnIndiaLevel = indiaWiseCount.industry.filter((i) => {
        return i.id == industry.id;
      });
      industry.indiaTotal = industryOnIndiaLevel[0].count;
      industry.indiaPercentage = Math.round(
        (industryOnIndiaLevel[0].count / indiaWiseCount.TotalIndustry) * 100
      );
      indArr.push(industry);
    }
    output.industry = indArr;

    var secArr = [];
    for (const sector of stateDetails.sector) {
      sector.percentage = Math.round(
        (sector.count / stateDetails.TotalSector) * 100
      );
      var sectorOnIndiaLevel = indiaWiseCount.sector.filter((s) => {
        return s.id == sector.id;
      });
      sector.indiaTotal = sectorOnIndiaLevel[0].count;
      sector.indiaPercentage = Math.round(
        (sectorOnIndiaLevel[0].count / indiaWiseCount.TotalSector) * 100
      );
      secArr.push(sector);
    }
    output.sector = secArr;

    var stgArr = [];
    for (const stage of stateDetails.stage) {
      stage.percentage = Math.round(
        (stage.count / stateDetails.TotalStage) * 100
      );
      var stageOnIndiaLevel = indiaWiseCount.stage.filter((s) => {
        return s.id == stage.id;
      });
      stage.indiaTotal = stageOnIndiaLevel[0].count;
      stage.indiaPercentage = Math.round(
        (stageOnIndiaLevel[0].count / indiaWiseCount.TotalStage) * 100
      );
      stgArr.push(stage);
    }
    output.stage = stgArr;

    resp.send(output);
  } else {
    // City/District level
  }
});

module.exports = router;
