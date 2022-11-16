const express = require("express");
const router = express.Router();
const request = require("request");
const mongodb = require("../mongodb");
const moment = require("moment");
const _ = require('lodash');
const { map } = require("lodash");

//test route
router.get("/testHome", async (req, resp) => {
    resp.send("Test Successful");
});
//Get top numbers
router.get("/topNumbers", async (req, resp) => {
  //This Api returns count of Startups, Mentors, Incubators, Investors, Accelerators and Government sectors for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = [];
  const industries = [];

  if ((!_.isEmpty(req.body.from)) && (!_.isEmpty(req.body.to))) {
    if (moment(req.body.from, "YYYY-MM-DD", true).isValid() && moment(req.body.to, "YYYY-MM-DD", true).isValid()) {
      acceptedParams.push("profileRegisteredOn");
      console.log("Valid dates passed.")
    }
    else {
      resp.status(500).json({ message: 'Invalid Date Format, expected in YYYY-MM-DD' });
    }
  }

  if (!_.isEmpty(req.body.stateId)) {
    acceptedParams.push("stateId");
  }

  if (!_.isEmpty(req.body.districtId)) {
    acceptedParams.push("districtId");
  }

  if (!_.isEmpty(req.body.industries)) {
    acceptedParams.push("industries");

    for (let industry of req.body.industries) {
      industries.push(industry);
    }
  }

  let sectors = [];
  if (!_.isEmpty(req.body.sectors)) {
    acceptedParams.push("sectors");

    for (let sector of req.body.sectors) {
      sectors.push(sector);
    }
  }

  let badges = [];
  if (!_.isEmpty(req.body.badges)) {
    acceptedParams.push("badges");

    for (let badge of req.body.badges) {
      badges.push(badge);
    }
  }

  //Building default query set for building final queries based on input parameters
  const obj = {
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": req.body.from, "$lte": req.body.to } },
    stateId: { "stateId": req.body.stateId },
    districtId: { "districtId": req.body.districtId },
    industries: { "industry._id": { $in: industries } },
    sectors: { "sector._id": { $in: sectors } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }


  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])

  console.log({ matchQueryArr });
  // console.log({result: array[1]["industry._id"]});

  // resp.send(match);
  const facetArr = ["Startup", "Investor", "Accelerator", "Mentor", "GovernmentBody", "Incubator"];
  let facetMap = new Map();
  facetArr.forEach(e =>
    facetMap.set(e, [{ "$match": { "role": { "$eq": e }, } }, { "$count": e }])
  );
  let facetQuery = Object.fromEntries(facetMap);

  console.log({ facetQuery });

  let projectMap = new Map();
  facetArr.forEach(e =>
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] })

  );
  // resp.send(Object.fromEntries(projectMap));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [
    {
      "$match": {
        "$and": matchQueryArr
      }
    },
    {
      "$facet": facetQuery
    },
    {
      "$project": projectQuery
    }
  ];
  // resp.send(JSON.stringify(query));
  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query).toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
          resp.send(output);
        });
    } catch (err) {
      console.error('toNumbers :: ' + err.message);
    }
  });
  return Promise.all([promAll])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });

});

router.get("/startupCounts", async (req, resp) => {
  //This Api returns count of Startups based on their types for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = ["role"];
  const industries = [];

  if ((!_.isEmpty(req.body.from)) && (!_.isEmpty(req.body.to))) {
    if (moment(req.body.from, "YYYY-MM-DD", true).isValid() && moment(req.body.to, "YYYY-MM-DD", true).isValid()) {
      acceptedParams.push("profileRegisteredOn");
      console.log("Valid dates passed.")
    }
    else {
      resp.status(500).json({ message: 'Invalid Date Format, expected in YYYY-MM-DD' });
    }
  }

  if (!_.isEmpty(req.body.stateId)) {
    acceptedParams.push("stateId");
  }

  if (!_.isEmpty(req.body.districtId)) {
    acceptedParams.push("districtId");
  }

  if (!_.isEmpty(req.body.industries)) {
    acceptedParams.push("industries");

    for (let industry of req.body.industries) {
      industries.push(industry);
    }
  }

  let sectors = [];
  if (!_.isEmpty(req.body.sectors)) {
    acceptedParams.push("sectors");

    for (let sector of req.body.sectors) {
      sectors.push(sector);
    }
  }

  let badges = [];
  if (!_.isEmpty(req.body.badges)) {
    acceptedParams.push("badges");

    for (let badge of req.body.badges) {
      badges.push(badge);
    }
  }

  //Building default query set for building final queries based on input parameters
  const obj = {
    role: { "role": { "$eq": "Startup" } },
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": req.body.from, "$lte": req.body.to } },
    stateId: { "stateId": req.body.stateId },
    districtId: { "districtId": req.body.districtId },
    industries: { "industry._id": { $in: industries } },
    sectors: { "sector._id": { $in: sectors } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }


  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])

  console.log({ matchQueryArr });
  // console.log({result: array[1]["industry._id"]});

  // resp.send(match);
  const facetArr = ["dpiitCertified", "showcased","seedFunded","fundOfFunds",
  "seedFunded","patented","womenOwned", "leadingSector", "declaredRewards"];
  let facetMap = new Map();
  facetArr.forEach(e =>
    facetMap.set(e, [{ "$match": { [e]: { "$eq": "1" }, } }, { "$count": e }])
  );
  let facetQuery = Object.fromEntries(facetMap);

  // resp.send({ facetQuery });

  let projectMap = new Map();
  facetArr.forEach(e =>
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] })

  );
  // resp.send(Object.fromEntries(projectMap));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [
    {
      "$match": {
        "$and": matchQueryArr
      }
    },
    {
      "$facet": facetQuery
    },
    {
      "$project": projectQuery
    }
  ];
  // resp.send(JSON.stringify(query));
  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query).toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
          resp.send(output);
        });
    } catch (err) {
      console.error('toNumbers :: ' + err.message);
    }
  });
  return Promise.all([promAll])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });

});

module.exports = router;
