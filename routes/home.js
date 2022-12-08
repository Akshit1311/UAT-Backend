const express = require("express");
const router = express.Router();
const request = require("request");
const mongodb = require("../mongodb");
const moment = require("moment");
const _ = require('lodash');
const { map } = require("lodash");
const e = require("express");

const roleTypes = ["Startup", "Investor", "Accelerator", "Mentor", "GovernmentBody", "Incubator"];

const startupTypes = ["dpiitCertified", "showcased","seedFunded","fundOfFunds",
"seedFunded","patented","womenOwned", "leadingSector", "declaredRewards"];

//Get top numbers POST API
router.post("/topNumbers", async (req, resp) => {
  //This Api returns count of Startups, Mentors, Incubators, Investors, Accelerators and Government sectors for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = [];
  const industries = [];
  const sectors=[];
  const badges=[];
  checkBody(req.body,acceptedParams,industries,sectors,badges);

  const from = new Date(req.body.from);
  const to = new Date(req.body.to);

  //Building default query set for building final queries based on input parameters
  const obj = {
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
    stateId: { "stateId": req.body.stateId },
    districtId: { "districtId": req.body.districtId },
    industries: { "industry._id": { $in: industries } },
    sectors: { "sector._id": { $in: sectors } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }

  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])
  
  let facetMap = new Map();
  let projectMap = new Map();
  roleTypes.forEach(e =>{
    facetMap.set(e, [{ "$match": { "role": { "$eq": e }, } }, { "$count": e }]);
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] })
  }
  );
  let facetQuery = Object.fromEntries(facetMap);

//   let projectMap = new Map();
//   roleTypes.forEach(e =>
//     projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] })
//   );
// ;
  let projectQuery = Object.fromEntries(projectMap);
 
  let query = [];
  //If any selection criteria then add it here
  if (matchQueryArr.length) {
      query.push({"$match": {"$and": matchQueryArr}
      });

  };
  query.push({"$facet": facetQuery});
  query.push({"$project": projectQuery});
  return executeQuery(resp,query);

});
router.get("/startupCounts", async (req, resp) => {
  //This Api returns count of Startups based on their types for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = ["role"];
  const industries = [];
  const sectors=[];
  const badges=[];
  checkBody(req.query,acceptedParams,industries,sectors,badges)
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);

  //Building default body set for building final queries based on input parameters
  const obj = {
    role: { "role": { "$eq": "Startup" } },
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
    stateId: { "stateId": req.query.stateId },
    districtId: { "districtId": req.query.districtId },
    industries: { "industry._id": { $in: industries } },
    sectors: { "sector._id": { $in: sectors } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }

  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])

  let facetMap = new Map();
  let projectMap = new Map();
  startupTypes.forEach(e => {
    facetMap.set(e, [{ "$match": { [e]: { "$eq": true }, } }, { "$count": e }]);
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] });
  }
  );

  let facetQuery = Object.fromEntries(facetMap);
  // let projectMap = new Map();
  // startupTypes.forEach(e =>
  //   projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] })

  // );
 
  let projectQuery = Object.fromEntries(projectMap);
  let query=[];
  if (matchQueryArr.length) {
    query.push({"$match": {"$and": matchQueryArr}
    });
   };
  query.push({"$facet": facetQuery});
  query.push({"$project": projectQuery});

return executeQuery(resp,query);

});

router.get("/leadingSector", async (req, resp) => {

  let stateId = req.query.stateId;
  let sectorwiseCounts = await getSectorWiseCounts(stateId);
  let output= sectorwiseCounts.filter(e=>(e._id!="Others" && e._id!="")); 
  resp.send(output[0]);

});
async function getSectorWiseCounts(stateId='') {
 

  let matchQuery ={$and:[{"role":'Startup'},] }
  if (stateId!=''){
    matchQuery={ $and:[{"stateId": { "$eq": stateId }},{"role":'Startup'},]  }
  }
  const querySectorwiseCount = [
    { $unwind:  { path: "$sector" } },
    { "$match": matchQuery },
    { $group:   {  _id: "$sector.name", count: { $sum:1 } } },
    { $sort:    { "count": -1 } }
  ];


  var prom = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(querySectorwiseCount).limit(5).toArray(async (err, result) => {
          if (err) throw err;
          let output = await result;
          resolve(output);
        });
    } catch (err) {
      console.error('sectorwiseCounts :: ' + err.message);
    }
  });
  return Promise.all([prom])
    .then((values) => {
      //  console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });

}

function checkBody(param,acceptedParams,industries,sectors,badges) {
  if ((!_.isEmpty(param.from)) && (!_.isEmpty(param.to))) {
    if (moment(param.from, "YYYY-MM-DD", true).isValid() && moment(param.to, "YYYY-MM-DD", true).isValid()) {
      acceptedParams.push("profileRegisteredOn");
      console.log("Valid dates passed.")
    }
    else {
      resp.status(500).json({ message: 'Invalid Date Format, expected in YYYY-MM-DD' });
    }
  }
  
  if (!_.isEmpty(param.stateId)) {
    acceptedParams.push("stateId");
  }

  if (!_.isEmpty(param.districtId)) {
    acceptedParams.push("districtId");
  }

  if (!_.isEmpty(param.industries)) {
    acceptedParams.push("industries");

    for (let industry of param.industries) {
      industries.push(industry);
    }
  }

  if (!_.isEmpty(param.sectors)) {
    acceptedParams.push("sectors");

    for (let sector of param.sectors) {
      sectors.push(sector);
    }
  }

  if (!_.isEmpty(param.badges)) {
    acceptedParams.push("badges");

    for (let badge of param.badges) {
      badges.push(badge);
    }
  }
}

async function executeQuery(resp,query) {
  let promAll = new Promise((resolve, rej) => {
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
}
module.exports = router;
