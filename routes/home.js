const express = require("express");
const router = express.Router();
const request = require("request");
const mongodb = require("../mongodb");
const moment = require("moment");
const _ = require('lodash');
const { map } = require("lodash");
const e = require("express");
const { isValidObjectId, Mongoose} = require("mongoose");
const {ObjectId} = require('mongodb');

const roleTypes = ["Startup", "Investor", "Accelerator", "Mentor", "GovernmentBody", "Incubator"];

const startupTypes = ["allStartups","dpiitCertified", "showcased","seedFunded","fundOfFunds",
"seedFunded","patented","womenOwned", "leadingSector", "declaredRewards"];

//Get top numbers POST API
router.post("/topNumbers", async (req, resp) => {
  //This Api returns count of Startups, Mentors, Incubators, Investors, Accelerators and Government sectors for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = [];
  const states=[];
  const industries = [];
  const sectors=[];
  const stages=[];
  const badges=[];
  checkBody(req.body,acceptedParams,states,industries,sectors,stages,badges);
 
  const from = new Date(req.body.from);
  const to = new Date(req.body.to);
  var ObjectId = require('mongodb').ObjectId;
  console.log(industries)
  const ind =industries.map(e=>e=ObjectId(e));
  const sect =sectors.map(e=>e=ObjectId(e));

  //Building default query set for building final queries based on input parameters
  const obj = {
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
    states: { "stateId": states[0] },
    // stateId: { "stateId": req.body.stateId },
    districtId: { "districtId": req.body.districtId },
    industries: { "industry._id": { $in: ind } },
    sectors: { "sector._id": { $in: sect } },
    stages: { "stage": { $in: stages } },
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

  let projectQuery = Object.fromEntries(projectMap);
 
  let query = [];
  //If any selection criteria then add it here
  if (matchQueryArr.length) {
      query.push({"$match": {"$and": matchQueryArr}
      });

  };

  query.push({"$facet": facetQuery});
  query.push({"$project": projectQuery});
  console.log(JSON.stringify(query))
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
  const stages=[];
  const badges=[];
  const types=[];

  checkBody(req.query,acceptedParams,industries,sectors,stages,badges);
  if (!_.isEmpty(req.query.type)) {
    types.push(req.query.type);
  }
  const from = (req.query.from);
  const to = (req.query.to);

  //Building default body set for building final queries based on input parameters
  const obj = {
    role: { "role": { "$eq": "Startup" } },
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
    stateId: { "stateId": req.query.stateId },
    districtId: { "districtId": req.query.districtId },
    industries: { "industry._id": { $in: industries } },
    sectors: { "sector._id": { $in: sectors } },
    stages: { "stage": { $in: stages } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }

  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])

  let facetMap = new Map();
  let projectMap = new Map();
 
  startupTypes.filter(item => types.includes(item)).forEach(e => {
  if (e=='allStartups') {
      facetMap.set(e, [ { "$count": e }]);
  }
  else {
  facetMap.set(e, [{ "$match": { [e]: { "$eq": true }, } }, { "$count": e }]);
  }
  
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] });
  }
  );


  let facetQuery = Object.fromEntries(facetMap);
 
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
router.post("/startupCounts/:startupType", async (req, resp) => {
  //This Api returns count of Startups based on their types for whole country
  //If passed stateId then the counts are for a particular state
  //If passed district id then the counts are for a particular district
  //if from and to dates are passed then count is shown for startups registered between the given dates

  //Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
  const acceptedParams = ["role"];
  const states=[];
  const industries = [];
  const sectors=[];
  const stages=[];
  const badges=[];
 
  let types = [...startupTypes];

  checkBody(req.body,acceptedParams,states,industries,sectors,stages,badges);
  if (!_.isEmpty(req.params.startupType)) {
    if ((startupTypes.includes(req.params.startupType))) {
      types=startupTypes.filter(e=>e===req.params.startupType)
    }
  }

  const from =new Date(req.body.from);
  const to =new Date(req.body.to);
  const ind =industries.map(e=>e=ObjectId(e));
  const sect =sectors.map(e=>e=ObjectId(e));
  //Building default body set for building final queries based on input parameters
  const obj = {
    role: { "role": { "$eq": "Startup" } },
    profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
    states: { "stateId": states[0] },
    // stateId: { "stateId": req.body.stateId },
    districtId: { "districtId": req.body.districtId },
    industries: { "industry._id": { $in: ind } },
    sectors: { "sector._id": { $in: sect } },
    stages: { "stage": { $in: stages } },
    badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
  }

  const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])

  let facetMap = new Map();
  let projectMap = new Map();
 
  startupTypes.filter(item => types.includes(item)).forEach(e => {
    if (e=='allStartups') {
        facetMap.set(e, [ { "$count": e }]);
    }
    else {
    facetMap.set(e, [{ "$match": { [e]: { "$eq": true }, } }, { "$count": e }]);
    }
    projectMap.set(e, { "$arrayElemAt": [`$${e}.${e}`, 0] });
    
  }
  );

  let facetQuery = Object.fromEntries(facetMap);
 
  let projectQuery = Object.fromEntries(projectMap);
  let query=[];
  if (matchQueryArr.length) {
    query.push({"$match": {"$and": matchQueryArr}
    });
   };
  query.push({"$facet": facetQuery});
  query.push({"$project": projectQuery});
  console.log(JSON.stringify(query))

return executeQuery(resp,query);

});

router.post("/leadingSector",async(req,resp)=>{
//Array to accept variable parameters e.g. stateId, industries, sectors, from and to dates
const acceptedParams = ["role"];
const states=[];
const industries = [];
const sectors=[];
const stages=[];
const badges=[];
checkBody(req.body,acceptedParams,states,industries,sectors,stages,badges);

//Convert to Date Format for comparison
const from = new Date(req.body.from);
const to = new Date(req.body.to);

//Add Object Id for compatibility with mongodb version 3.4.17
const ind =industries.map(e=>e=ObjectId(e));
const sect =sectors.map(e=>e=ObjectId(e));

//Building default body set for building final queries based on input parameters
const obj = {
  role: { "role": { "$eq": "Startup" } },
  profileRegisteredOn: { "profileRegisteredOn": { "$gte": from, "$lte": to } },
  states: { "stateId": states[0] },
  // stateId: { "stateId": req.body.stateId },
  districtId: { "districtId": req.body.districtId },
  industries: { "industry._id": { $in: ind } },
  sectors: { "sector._id": { $in: sect } },
  stages: { "stage": { $in: stages } },
  badges: { "badges": { "$exists": true, "$type": 'array', "$ne": [] } }
};
const matchQueryArr = Object.keys(obj).filter(key => acceptedParams.includes(key)).map(key => obj[key])
let sectorwiseCounts = await getSectorCounts(matchQueryArr);
let output= sectorwiseCounts.filter(e=>(e._id.name!="Others" && e._id.name!="")); 
  resp.send(output[0]);
});


// router.get("/leadingSector", async (req, resp) => {

//   let stateId = req.query.stateId;
//   let sectorwiseCounts = await getSectorWiseCounts(stateId);
//   let output= sectorwiseCounts.filter(e=>(e._id!="Others" && e._id!="")); 
//   resp.send(output[0]);

// });

async function getSectorCounts(matchQuery='') {
 
  const querySectorwiseCount = [
    { $unwind:  { path: "$sector" } },
    { "$match": {$and:matchQuery }},
    { "$group": { "_id": {"sectorId": "$sector._id","name":"$sector.name"}, count: { $sum:1 } } },
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
// async function getSectorWiseCounts(stateId='') {
 
//   let matchQuery ={$and:[{"role":'Startup'},] }
//   if (stateId!=''){
//     matchQuery={ $and:[{"stateId": { "$eq": stateId }},{"role":'Startup'},]  }
//   }
//   const querySectorwiseCount = [
//     { $unwind:  { path: "$sector" } },
//     { "$match": matchQuery },
//     { "$group": { "_id": {"_id": "$sector._id","name":"$sector.name"}, count: { $sum:1 } } },
//     { "$sort":    { "count": -1 } }
//   ];


//   var prom = new Promise((resolve, rej) => {
//     try {
//       mongodb
//         .getDb()
//         .collection("digitalMapUser")
//         .aggregate(querySectorwiseCount).limit(5).toArray(async (err, result) => {
//           if (err) throw err;
//           let output = await result;
//           resolve(output);
//         });
//     } catch (err) {
//       console.error('sectorwiseCounts :: ' + err.message);
//     }
//   });
//   return Promise.all([prom])
//     .then((values) => {
//       //  console.log("All promises resolved - " + JSON.stringify(values));
//       return values[0];
//     })
//     .catch((reason) => {
//       console.log(reason);
//     });

// }

function checkBody(param,acceptedParams,states,industries,sectors,stages,badges) {
 
  if ((!_.isEmpty(param.from)) && (!_.isEmpty(param.to))) {
    if (moment(param.from, "YYYY-MM-DD", true).isValid() && moment(param.to, "YYYY-MM-DD", true).isValid()) {
      acceptedParams.push("profileRegisteredOn");
      console.log("Valid dates passed.")
    }
    else {
      resp.status(500).json({ message: 'Invalid Date Format, expected in YYYY-MM-DD' });
    }
  }
  

  if (!_.isEmpty(param.states)) {
    acceptedParams.push("states");

    for (let state of param.states) {
      states.push(state);
    }
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

  if (!_.isEmpty(param.stages)) {
    acceptedParams.push("stages");

    for (let stage of param.stages) {
      stages.push(stage);
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
