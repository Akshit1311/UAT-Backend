const express = require("express");
const router = express.Router();
const request = require("request");
const _ = require("lodash");
const fs = require("fs");
const mongodb = require("../mongodb");
const { resolve } = require("path");
const ObjectId = require("mongodb").ObjectId;

var stateStatistics = fs.readFileSync("./static/stateStatistics.json", "utf8");
stateStatistics = JSON.parse(stateStatistics);
var stateMap = fs.readFileSync("./static/stateMap.json", "utf8");
stateMap = JSON.parse(stateMap);
var blankFilterQuery = fs.readFileSync(
  "./static/blankFilterQuery.json",
  "utf8"
);
blankFilterQuery = JSON.parse(blankFilterQuery);

var dataCountJson = {
  Exploring: 0,
  Incubator: 0,
  Corporate: 0,
  SIH_Admin: 0,
  Mentor: 0,
  Academia: 0,
  GovernmentBody: 0,
  ConnectToPotentialPartner: 0,
  IndiaMarketEntry: 0,
  Individual: 0,
  ServiceProvider: 0,
  Investor: 0,
  Startup: 0,
  Accelerator: 0,
  DpiitCertified: 0,
  TaxExempted: 0,
  WomenLed: 0,
  PatentStartup: 0,
  SeedFundStartup: 0,
  ShowcasedStartups: 0,
};

var dataCountMap = {
  Startup: 0,
  Mentor: 0,
  Incubator: 0,
  Investor: 0,
  Accelerator: 0,
  GovernmentBody: 0,
};

var dataCountOthers = {
  DpiitCertified: 0,
  ShowcasedStartups: 0,
  SeedFunded: 0,
  Patented: 0,
  WomenLed: 0,
  LeadingSector: 0,
  DeclaredRewards: 0,
};
router.get("/test", (req, res) => {
  res.json({ status: "ok" });
});
router.get(
  "/statistics/:geographicalEntity/:entityId/:from/:to",
  (req, resp) => {
    // #swagger.tags = ['Data Tables']
    // #swagger.path = '/data/statistics/{geographicalEntity}/{entityId}/{from}/{to}'
    // #swagger.exmaple = '/data/statistics/country/5f02e38c6f3de87babe20cd2/{from}/{to}'
    // #swagger.description = 'State-wise data table'
    var output = {};
    output.from = req.params.from;
    output.to = req.params.to;

    var result = [];
    if (req.params.geographicalEntity == "country") {
      // Country - India level
      var stateWiseCount = fs.readFileSync(
        "./static/stateWiseCount.json",
        "utf8"
      );
      stateWiseCount = JSON.parse(stateWiseCount);

      request(process.env.STATES_URL, { json: true }, (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        var apiData = res.body.data;
        for (var state in apiData) {
          apiData[state].statistics =
            stateWiseCount[apiData[state].id].statistics;
        }
        output.data = apiData;
        resp.send(output);
      });
    } else if (req.params.geographicalEntity == "state") {
      // State level
      console.log(
        "Praparing data table for State with Id - " + req.params.entityId
      );
      let stateId = req.params.entityId;
      var stateCityMap = fs.readFileSync("./static/stateCityMap.json", "utf8");
      stateCityMap = JSON.parse(stateCityMap);
      let cityArr = stateCityMap[stateId];

      let promiseArr = [];
      for (const city of cityArr) {
        let cityStaticticsObj = city;
        promiseArr.push(
          new Promise((resolve, rej) => {
            let query = JSON.parse(JSON.stringify(blankFilterQuery));
            query.cities = [city.id];

            let options = {
              method: "POST",
              url: process.env.BLANK_FILTER_URL,
              headers: {
                authority: "api.startupindia.gov.in",
                "sec-ch-ua":
                  '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
                accept: "application/json",
                lang: "",
                "sec-ch-ua-mobile": "?0",
                "user-agent":
                  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
                "sec-ch-ua-platform": '"Linux"',
                "content-type": "application/json",
                origin: "https://www.startupindia.gov.in",
                "sec-fetch-site": "same-site",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                referer: "https://www.startupindia.gov.in/",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7",
              },
              body: JSON.stringify(query),
            };

            request(options, (err, res, body) => {
              if (err) {
                return console.log(err);
              }
              //console.log(body);
              let dataCountJsonObj = JSON.parse(JSON.stringify(dataCountJson));
              let facetResult = JSON.parse(body).facetResultPages;
              let industryBasedNumbers = facetResult[0].content;
              let sectorBasedNumbers = facetResult[1].content;
              let roleBasedNumbers = facetResult[5].content;
              let stageBasedNumbers = facetResult[6].content;

              var industryArr = [];
              var totalIndustriesOfState = 0;
              for (const ind of industryBasedNumbers) {
                industryArr.push({
                  id: ind.value,
                  text: ind.field.value,
                  count: ind.valueCount,
                });
                totalIndustriesOfState += ind.valueCount;
              }
              dataCountJsonObj.industry = industryArr;
              dataCountJsonObj.TotalIndustry = totalIndustriesOfState;

              // Storing Sectors
              var sectorArr = [];
              var totalSectorsOfState = 0;
              for (const sec of sectorBasedNumbers) {
                sectorArr.push({
                  id: sec.value,
                  text: sec.field.value,
                  count: sec.valueCount,
                });
                totalSectorsOfState += sec.valueCount;
              }
              dataCountJsonObj.sector = sectorArr;
              dataCountJsonObj.TotalSector = totalSectorsOfState;

              // Storing Stages
              var stageArr = [];
              var totalStagesOfState = 0;
              for (const stg of stageBasedNumbers) {
                stageArr.push({
                  id: stg.value,
                  text: stg.field.value,
                  count: stg.valueCount,
                });
                totalStagesOfState += stg.valueCount;
              }
              dataCountJsonObj.stage = stageArr;
              dataCountJsonObj.TotalStage = totalStagesOfState;

              cityStaticticsObj.statistics = dataCountJsonObj;

              resolve(cityStaticticsObj);
            });
          })
        );
      }

      resp.send(
        Promise.all(promiseArr)
          .then((values) => {
            console.log("All promises resolved");
            return values;
          })
          .catch((reason) => {
            console.log(reason);
          })
      );
    } else {
      // City/District level
    }
  }
);

// router.get(
//   "/v2/statistics/:geographicalEntity/:entityId/:from/:to",
//   async (req, resp) => {
//     // #swagger.tags = ['Data Tables']
//     // #swagger.path = '/data/v2/statistics/{geographicalEntity}/{entityId}/{from}/{to}'
//     // #swagger.exmaple = '/data/v2/statistics/country/5f02e38c6f3de87babe20cd2/{from}/{to}'
//     // #swagger.description = 'State-wise data table'
//     var output = {};
//     output.from = req.params.from;
//     output.to = req.params.to;

//     if ((!_.isEmpty(req.params.from) && !_.isEmpty(req.params.to)) ||
//       moment(req.params.from, "YYYY-MM-DD", true).isValid() && moment(req.params.to, "YYYY-MM-DD", true).isValid()) {
//       console.log("Valid dates passed.")
//     } else {
//       resp.status(500).json({ message: 'Invalid Date Format, expected in YYYY-MM-DD' });
//     }

//     let subQuery = {};
//     subQuery.profileRegisteredOn = {
//       "$lte": new Date(req.params.to),
//       "$gte": new Date(req.params.from),
//     };

//     var result = [];
//     if (req.params.geographicalEntity == "country") {
//       // Country - India level
//       let wos = await populateWomenLedStartup(req.params.from, req.params.to);
//       let txs = await populateTaxExemptedStartup(req.params.from, req.params.to);
//       let drs = await populateDpiitRecognizedStartup(req.params.from, req.params.to);
//       let pss = await populatePatentedStartup(req.params.from, req.params.to);
//       let scs = await populateShowcasedStartup(req.params.from, req.params.to);
//       let sfs = await populateSeedFundedStartup(req.params.from, req.params.to);
//       let ffs = await populateFundOfFundStartup(req.params.from, req.params.to);

//       try {
//         await mongodb
//           .getDb()
//           .collection("digitalMapUser")
//           .aggregate([
//             {
//               "$match": subQuery,
//             },
//             {
//               "$group": {
//                 "_id": {
//                   "role": "$role",
//                   "stateId": "$stateId",
//                   "state": "$stateName",
//                 },
//                 "count": { "$sum": 1 },
//               },
//             },
//             {
//               "$group": {
//                 "_id": "$_id.stateId",
//                 "roles": {
//                   "$push": { "role": "$_id.role", "state": "$_id.state", "count": "count" },
//                 },
//               },
//             },
//           ]).toArray((err, result) => {
//             if (err) throw err;

//             let countsArr = [];
//             for (let i = 0; i < result.length; i++) {
//               let stateData = result[i];
//               let stateId = stateData._id;
//               let state = {};
//               let count = JSON.parse(JSON.stringify(dataCountJson));

//               state.id = stateId;
//               state.name = stateData.roles[0].state;
//               state.text = stateData.roles[0].state;
//               state.isUnionTerritory = false;

//               for (let j = 0; j < stateData.roles.length; j++) {
//                 let role = stateData.roles[j];
//                 count[role.role] = role.count;
//               }
//               count.WomenLed = wos.hasOwnProperty(stateId) ? wos[stateId] : 0;
//               count.TaxExempted = txs.hasOwnProperty(stateId) ? txs[stateId] : 0;
//               count.DpiitCertified = drs.hasOwnProperty(stateId) ? drs[stateId] : 0;
//               count.PatentStartup = pss.hasOwnProperty(stateId) ? pss[stateId] : 0;
//               count.ShowcasedStartups = scs.hasOwnProperty(stateId) ? scs[stateId] : 0;
//               count.SeedFundStartup = sfs.hasOwnProperty(stateId) ? sfs[stateId] : 0;
//               count.FFS = ffs.hasOwnProperty(stateId) ? ffs[stateId] : 0;

//               state.statistics = count;
//               countsArr.push(state);
//             }
//             output.data = countsArr;
//             resp.status(200).send(output);
//           });
//       } catch (err) {
//         resp.status(500).json({ message: err.message });
//       }
//     } else if (req.params.geographicalEntity == "state") {
//       // State level
//       let stateId = req.params.entityId;

//       let stateCounts = await populateMultiFieldCountsForStateV2(stateId, req.params.from, req.params.to);
//       let map = new Map();
//       let items = Object.keys(stateCounts);
//       for (let i = 0; i < items.length; i++) {
//         let key = items[i];
//         let v = stateCounts[key].length ? stateCounts[key][0] : [];
//         for (let j = 0; j < v.length; j++) {
//           let x = v[j];
//           let c = x.count;
//           x = x._id;

//           if (map.has(x.districtId)) {
//             let countData = map.get(x.districtId);
//             countData.statistics[key] = c;
//             map.set(x.districtId, countData);
//           } else {
//             let placeholder = JSON.parse(JSON.stringify(dataCountJson));
//             placeholder[key] = c;
//             let data = {};
//             data.districtId = x.districtId;
//             data.district = x.district;
//             data.stateId = x.stateId;
//             data.state = x.state;
//             data.statistics = placeholder;
//             map.set(x.districtId, data);
//           }
//         }
//       }

//       let countsArr = [];
//       for (let [key, val] of map.entries()) {
//         let district = {};
//         let count = JSON.parse(JSON.stringify(dataCountJson));

//         district.districtId = key;
//         district.district = val.district;
//         district.stateId = val.stateId;
//         district.state = val.state;

//         count.WomenLed = fillUndefined(val.statistics.WomenOwned);
//         count.TaxExempted = fillUndefined(val.statistics.TaxExempted);
//         count.ShowcasedStartups = fillUndefined(val.statistics.ShowcasedStartups);
//         count.SeedFundStartup = fillUndefined(val.statistics.SeedFunded);
//         count.FFS = fillUndefined(val.statistics.FFS);
//         count.DpiitCertified = fillUndefined(val.statistics.DpiitCertified);
//         count.PatentStartup = fillUndefined(val.statistics.PatentStartup);
//         count.Startup = fillUndefined(val.statistics.Startup);
//         count.Mentor = fillUndefined(val.statistics.Mentor);
//         count.Incubator = fillUndefined(val.statistics.Incubator);
//         count.Investor = fillUndefined(val.statistics.Investor);
//         count.Individual = fillUndefined(val.statistics.Individual);
//         count.GovernmentBody = fillUndefined(val.statistics.GovernmentBody);
//         count.Accelerator = fillUndefined(val.statistics.Accelerator);

//         district.statistics = count;
//         countsArr.push(district);
//       }
//       output.data = countsArr;
//       resp.status(200).send(output);
//     } else {
//       // City/District level
//     }
//   }
// );

router.post(
  "/v2/statistics/:geographicalEntity/:entityId/:from/:to",
  async (req, resp) => {
    // #swagger.tags = ['Data Tables']
    // #swagger.path = '/data/v2/statistics/{geographicalEntity}/{entityId}/{from}/{to}'
    // #swagger.exmaple = '/data/v2/statistics/country/5f02e38c6f3de87babe20cd2/{from}/{to}'
    // #swagger.description = 'State-wise data table'
    /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$stages": ["Scaling", "EarlyTraction", "Validation"],
        }
    } */
    //Initialize output json
    var output = {};
    output.from = req.params.from;
    output.to = req.params.to;
    //change requested parameters to date type for PROD
    const from = new Date(req.params.from);
    const to = new Date(req.params.to);

    if (
      (!_.isEmpty(req.params.from) && !_.isEmpty(req.params.to)) ||
      (moment(req.params.from, "YYYY-MM-DD", true).isValid() &&
        moment(req.params.to, "YYYY-MM-DD", true).isValid())
    ) {
      console.log("Valid dates passed.");
    } else {
      resp
        .status(500)
        .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
    }

    let subQuery = {};
    subQuery.profileRegisteredOn = {
      $lte: to,
      $gte: from,
    };

    //In case api is called for country
    if (req.params.geographicalEntity == "country") {
      let countryCounts = await populateMultiFieldCountsForCountryV3(
        from,
        to,
        req.body
      );
      let map = new Map();
      //Capture the array of counts retrieved from mongo
      let items = Object.keys(countryCounts);
      for (let i = 0; i < items.length; i++) {
        let key = items[i];

        let v = countryCounts[key].length ? countryCounts[key][0] : [];
        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;

          //If state id is null then ignore otherwise convert stateid to string
          let stId = "";
          if (x.stateId == null) {
            continue;
          } else {
            stId = x.stateId.toString();
          }

          //IF state id already exists then update count otherise add record
          if (map.has(stId)) {
            let countData = map.get(stId);
            countData.statistics[key] = c;
            map.set(stId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountJson));
            placeholder[key] = c;
            let data = {};
            data.stateId = stId;
            data.state = x.state;
            data.statistics = placeholder;
            map.set(stId, data);
          }
        }
      }

      //Push all values statewise in a states array
      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let state = {};
        let count = JSON.parse(JSON.stringify(dataCountJson));

        state.stateId = key;
        state.id = key;
        state.state = val.state;
        state.name = val.state;
        state.text = val.state;

        count.WomenLed = fillUndefined(val.statistics.WomenOwned);
        count.TaxExempted = fillUndefined(val.statistics.TaxExempted);
        count.ShowcasedStartups = fillUndefined(
          val.statistics.ShowcasedStartups
        );
        count.SeedFundStartup = fillUndefined(val.statistics.SeedFunded);
        count.DpiitCertified = fillUndefined(val.statistics.DpiitCertified);
        count.PatentStartup = fillUndefined(val.statistics.PatentStartup);
        count.Startup = fillUndefined(val.statistics.Startup);
        count.Mentor = fillUndefined(val.statistics.Mentor);
        count.Incubator = fillUndefined(val.statistics.Incubator);
        count.Investor = fillUndefined(val.statistics.Investor);
        count.Individual = fillUndefined(val.statistics.Individual);
        count.GovernmentBody = fillUndefined(val.statistics.GovernmentBody);
        count.Accelerator = fillUndefined(val.statistics.Accelerator);

        state.statistics = count;
        countsArr.push(state);
      }
      output.data = countsArr;
      resp.status(200).send(output);
    } else if (req.params.geographicalEntity == "state") {
      // State level
      let stateId = req.params.entityId;
      // console.log('stateId =',stateId);

      let stateCounts = await populateMultiFieldCountsForStateV3(
        ObjectId(stateId),
        from,
        to,
        req.body
      );
      // resp.send(JSON.stringify(stateCounts));
      let map = new Map();
      // items = districts
      let items = Object.keys(stateCounts);
      for (let i = 0; i < items.length; i++) {
        let key = items[i];
        let v = stateCounts[key].length ? stateCounts[key][0] : [];
        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;
          let dId = "";
          if (x.districtId == null) {
            continue;
          } else {
            dId = x.districtId.toString();
          }

          if (map.has(dId)) {
            let countData = map.get(dId);
            countData.statistics[key] = c;
            map.set(dId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountJson));
            placeholder[key] = c;
            let data = {};
            data.districtId = dId;
            data.district = x.district;
            data.stateId = x.stateId.toString();
            data.state = x.state;
            data.statistics = placeholder;
            map.set(dId, data);
          }
        }
      }

      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let district = {};
        let count = JSON.parse(JSON.stringify(dataCountJson));

        district.districtId = key;
        district.district = val.district;
        district.stateId = val.stateId;
        district.state = val.state;

        count.WomenLed = fillUndefined(val.statistics.WomenOwned);
        count.TaxExempted = fillUndefined(val.statistics.TaxExempted);
        count.ShowcasedStartups = fillUndefined(
          val.statistics.ShowcasedStartups
        );
        count.SeedFundStartup = fillUndefined(val.statistics.SeedFunded);
        count.DpiitCertified = fillUndefined(val.statistics.DpiitCertified);
        count.PatentStartup = fillUndefined(val.statistics.PatentStartup);
        count.Startup = fillUndefined(val.statistics.Startup);
        count.Mentor = fillUndefined(val.statistics.Mentor);
        count.Incubator = fillUndefined(val.statistics.Incubator);
        count.Investor = fillUndefined(val.statistics.Investor);
        count.Individual = fillUndefined(val.statistics.Individual);
        count.GovernmentBody = fillUndefined(val.statistics.GovernmentBody);
        count.Accelerator = fillUndefined(val.statistics.Accelerator);

        district.statistics = count;
        countsArr.push(district);
      }
      output.data = countsArr;
      console.log(JSON.stringify(output));
      resp.status(200).send(output);
    } else {
      // City/District level
    }
  }
);

router.get("/v2/statistics/allDistricts/:from/:to", async (req, resp) => {
  // #swagger.tags = ['Data Tables']
  // #swagger.path = '/data/v2/statistics/allDistricts/{from}/{to}'
  // #swagger.exmaple = '/data/v2/statistics/allDistricts/{from}/{to}'
  // #swagger.description = 'District-wise data table for whole country'
  let allIndiaDistrictStats = {};
  allIndiaDistrictStats.from = new Date(req.params.from);
  allIndiaDistrictStats.to = new Date(req.params.to);
  allIndiaDistrictStats.max = JSON.parse(JSON.stringify(dataCountJson));

  if (
    (!_.isEmpty(req.params.from) && !_.isEmpty(req.params.to)) ||
    (moment(req.params.from, "YYYY-MM-DD", true).isValid() &&
      moment(req.params.to, "YYYY-MM-DD", true).isValid())
  ) {
    console.log("Valid dates passed.");
  } else {
    resp
      .status(500)
      .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
  }

  // Country wide - District Level counts
  let districtStats = await populateMultiFieldCountsForCountry(
    allIndiaDistrictStats.from,
    allIndiaDistrictStats.to
  );

  let map = new Map();
  let items = Object.keys(districtStats);
  for (let i = 0; i < items.length; i++) {
    let key = items[i];
    let v = districtStats[key].length ? districtStats[key][0] : [];
    for (let j = 0; j < v.length; j++) {
      let x = v[j];
      let c = x.count;
      x = x._id;
      if (x.districtId == null) {
        continue;
      } else {
        dId = x.districtId.toString();
      }
      if (map.has(dId)) {
        let countData = map.get(dId);
        countData.statistics[key] = c;
        map.set(dId, countData);
      } else {
        let placeholder = JSON.parse(JSON.stringify(dataCountJson));
        placeholder[key] = c;
        let data = {};
        data.districtId = dId;
        data.district = x.district;
        data.stateId = x.stateId;
        data.state = x.state;
        data.statistics = placeholder;
        map.set(dId, data);
      }

      if (c > allIndiaDistrictStats.max[key]) {
        allIndiaDistrictStats.max[key] = c;
      }
    }
  }

  let distArr = [];
  map.forEach((d) => {
    distArr.push(d);
  });
  allIndiaDistrictStats.data = distArr;

  resp.status(200).send(allIndiaDistrictStats);
});

router.get("/stateStatisticsLive/:from/:to", (req, resp) => {
  // #swagger.tags = ['Data Tables']
  // #swagger.path = '/data/stateStatisticsLive/{from}/{to}'
  // #swagger.description = 'State-wise data table'
  var output = {};
  output.from = req.params.from;
  output.to = req.params.to;

  var states = Object.keys(stateMap);
  var query = JSON.parse(JSON.stringify(blankFilterQuery));
  query.states = states;

  var options = {
    method: "POST",
    url: process.env.BLANK_FILTER_URL,
    headers: {
      authority: "api.startupindia.gov.in",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
      accept: "application/json",
      lang: "",
      "sec-ch-ua-mobile": "?0",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
      "sec-ch-ua-platform": '"Linux"',
      "content-type": "application/json",
      origin: "https://www.startupindia.gov.in",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://www.startupindia.gov.in/",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7",
    },
    body: JSON.stringify(query),
  };

  request(options, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    //console.log(body);
    var allItems = JSON.parse(body).content;
    resp.send(allItems);
  });

  request(process.env.STATES_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);

    var apiData = res.body.data;
    for (var state in apiData) {
      apiData[state].stateStatistics = stateStatistics;
    }
    output.data = apiData;
    resp.send(output);
  });
});

router.get("/startups/:from/:to", (req, resp) => {
  // #swagger.tags = ['Data Tables']
  // #swagger.path = '/data/startups/{from}/{to}'
  // #swagger.description = 'State-wise startups table'

  request(PROCESS.ENV.DPIIT_STATES, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);
    resp.send(res.body.data);
  });
});

router.get("/startup/:id", (req, resp) => {
  // #swagger.tags = ['Data Tables']
  // #swagger.path = '/data/startup/{id}'
  // #swagger.description = 'Start up details by Start up Id'

  var options = {
    method: "GET",
    url: process.env.STARTUP_DETAILS_URL + req.params.id,
    headers: {
      authority: "api.startupindia.gov.in",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
      accept: "*/*",
      lang: "",
      "sec-ch-ua-mobile": "?0",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
      "sec-ch-ua-platform": '"Linux"',
      origin: "https://www.startupindia.gov.in",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://www.startupindia.gov.in/",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7",
    },
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    resp.send(JSON.parse(response.body).user);
  });
});

async function populateWomenLedStartup(from, to) {
  var promWO = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              womenOwned: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          //console.log("populateWomenLedStartup :: Women Led startup data count - " + Object.keys(output));
          resolve(output);
        });
    } catch (err) {
      console.error("populateWomenLedStartup :: " + err.message);
    }
  });
  return Promise.all([promWO])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateTaxExemptedStartup(from, to) {
  var promTX = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              taxExempted: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          //console.log("populateTaxExemptedStartup :: Tax Exempted startup data count - " + Object.keys(output));
          resolve(output);
        });
    } catch (err) {
      console.error("populateTaxExemptedStartup :: " + err.message);
    }
  });
  return Promise.all([promTX])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateDpiitRecognizedStartup(from, to) {
  var promDR = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              dpiitCertified: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          //console.log("populateDpiitRecognizedStartup :: Dpiit Recognized startup data count - " + Object.keys(output));
          resolve(output);
        });
    } catch (err) {
      console.error("populateDpiitRecognizedStartup :: " + err.message);
    }
  });
  return Promise.all([promDR])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populatePatentedStartup(from, to) {
  var promPT = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              patented: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          //console.log("populatePatentedStartup :: Dpiit Recognized startup data count - " + Object.keys(output));
          resolve(output);
        });
    } catch (err) {
      console.error("populatePatentedStartup :: " + err.message);
    }
  });
  return Promise.all([promPT])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateShowcasedStartup(from, to) {
  var promSC = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              showcased: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          resolve(output);
        });
    } catch (err) {
      console.error("populateShowcasedStartup :: " + err.message);
    }
  });
  return Promise.all([promSC])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateSeedFundedStartup(from, to) {
  var promSF = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              seedFunded: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          resolve(output);
        });
    } catch (err) {
      console.error("populateSeedFundedStartup :: " + err.message);
    }
  });
  return Promise.all([promSF])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateFundOfFundStartup(from, to) {
  var promFF = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate([
          {
            $match: {
              fundOfFunds: { $eq: true },
              profileRegisteredOn: {
                $lte: to,
                $gte: from,
              },
            },
          },
          {
            $group: {
              _id: {
                StateId: "$stateId",
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await processStatewiseResults(result);
          resolve(output);
        });
    } catch (err) {
      console.error("populateFundOfFundStartup :: " + err.message);
    }
  });
  return Promise.all([promFF])
    .then((values) => {
      console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateMultiFieldCountsForState(stateId, from, to) {
  from = new Date(from);
  to = new Date(to);
  let query = [
    {
      $facet: {
        WomenOwned: [
          {
            $match: {
              womenOwned: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "WomenOwned" },
        ],
        SeedFunded: [
          {
            $match: {
              seedFunded: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "SeedFunded" },
        ],
        TaxExempted: [
          {
            $match: {
              taxExempted: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "TaxExempted" },
        ],
        DpiitCertified: [
          {
            $match: {
              dpiitCertified: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "DpiitCertified" },
        ],

        ShowcasedStartups: [
          {
            $match: {
              showcased: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "ShowcasedStartups" },
        ],
        PatentStartup: [
          {
            $match: {
              patented: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          { $count: "PatentStartup" },
        ],
      },
    },
    {
      $project: {
        WomenOwned: { $arrayElemAt: ["$WomenOwned.WomenOwned", 0] },
        SeedFunded: { $arrayElemAt: ["$SeedFunded.SeedFunded", 0] },
        TaxExempted: { $arrayElemAt: ["$TaxExempted.TaxExempted", 0] },
        DpiitCertified: { $arrayElemAt: ["$DpiitCertified.DpiitCertified", 0] },
        ShowcasedStartups: {
          $arrayElemAt: ["$ShowcasedStartups.ShowcasedStartups", 0],
        },
        PatentStartup: { $arrayElemAt: ["$PatentStartup.PatentStartup", 0] },
      },
    },
  ];

  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateMultiFieldCountsForState :: " + err.message);
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

async function populateMultiFieldCountsForStateV2(stateId, from, to) {
  from = new Date(from);
  to = new Date(to);
  let query = [
    {
      $facet: {
        Startup: [
          {
            $match: {
              role: { $eq: "Startup" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        Investor: [
          {
            $match: {
              role: { $eq: "Investor" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        Accelerator: [
          {
            $match: {
              role: { $eq: "Accelerator" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        Individual: [
          {
            $match: {
              role: { $eq: "Individual" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        Mentor: [
          {
            $match: {
              role: { $eq: "Mentor" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        GovernmentBody: [
          {
            $match: {
              role: { $eq: "GovernmentBody" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        Incubator: [
          {
            $match: {
              role: { $eq: "Incubator" },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        WomenOwned: [
          {
            $match: {
              womenOwned: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        SeedFunded: [
          {
            $match: {
              seedFunded: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        TaxExempted: [
          {
            $match: {
              taxExempted: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        DpiitCertified: [
          {
            $match: {
              dpiitCertified: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],

        ShowcasedStartups: [
          {
            $match: {
              showcased: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
        PatentStartup: [
          {
            $match: {
              patented: { $eq: true },
              stateId: { $eq: stateId },
              profileRegisteredOn: { $lte: to, $gte: from },
            },
          },
          {
            $group: {
              _id: {
                stateId: "$stateId",
                state: "$stateName",
                districtId: "$districtId",
                district: "$districtName",
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
    {
      $project: {
        Startup: ["$Startup"],
        Investor: ["$Investor"],
        Accelerator: ["$Accelerator"],
        Individual: ["$Individual"],
        Mentor: ["$Mentor"],
        GovernmentBody: ["$GovernmentBody"],
        Incubator: ["$Incubator"],
        WomenOwned: ["$WomenOwned"],
        SeedFunded: ["$SeedFunded"],
        TaxExempted: ["$TaxExempted"],
        DpiitCertified: ["$DpiitCertified"],
        ShowcasedStartups: ["$ShowcasedStartups"],
        PatentStartup: ["$PatentStartup"],
      },
    },
  ];

  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateMultiFieldCountsForState :: " + err.message);
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

async function populateMultiFieldCountsForStateV3(stateId, from, to, body) {
  let matchQuery = {
    $match: { stateId: stateId, profileRegisteredOn: { $lte: to, $gte: from } },
  };
  matchQuery = addAdditionalMatchConditions(matchQuery, body);
  const groupQuery = {
    _id: {
      stateId: "$stateId",
      state: "$stateName",
      districtId: "$districtId",
      district: "$districtName",
    },
    count: { $sum: 1 },
  };
  let startupQ = { role: "Startup", dpiitCertified: true };
  let investorQ = { role: "Investor" };
  let acceleratorQ = { role: "Accelerator" };
  let individualQ = { role: "Individual" };
  let mentorQ = { role: "Mentor" };
  let govBodyQ = { role: "GovernmentBody" };
  let incubatorQ = { role: "Incubator" };
  let womenOwnedQ = { womenOwned: true, dpiitCertified: true };
  let seedFundedQ = { seedFunded: true, dpiitCertified: true };
  let taxExemptedQ = { taxExempted: true, dpiitCertified: true };
  let dpiitCertifiedQ = { dpiitCertified: true };
  let showcasedQ = { showcased: true, dpiitCertified: true };
  let patentedQ = { patented: true, dpiitCertified: true };

  let query = [
    matchQuery,
    {
      $facet: {
        Startup: [
          { $match: startupQ },
          {
            $group: groupQuery,
          },
        ],
        Investor: [
          { $match: investorQ },
          {
            $group: groupQuery,
          },
        ],
        Accelerator: [
          { $match: acceleratorQ },
          {
            $group: groupQuery,
          },
        ],
        Individual: [
          { $match: individualQ },
          {
            $group: groupQuery,
          },
        ],
        Mentor: [
          { $match: mentorQ },
          {
            $group: groupQuery,
          },
        ],
        GovernmentBody: [
          { $match: govBodyQ },
          {
            $group: groupQuery,
          },
        ],
        Incubator: [
          { $match: incubatorQ },
          {
            $group: groupQuery,
          },
        ],
        WomenOwned: [
          { $match: womenOwnedQ },
          {
            $group: groupQuery,
          },
        ],
        SeedFunded: [
          { $match: seedFundedQ },
          {
            $group: groupQuery,
          },
        ],
        TaxExempted: [
          { $match: taxExemptedQ },
          {
            $group: groupQuery,
          },
        ],
        DpiitCertified: [
          { $match: dpiitCertifiedQ },
          {
            $group: groupQuery,
          },
        ],
        ShowcasedStartups: [
          { $match: showcasedQ },
          {
            $group: groupQuery,
          },
        ],
        PatentStartup: [
          { $match: patentedQ },
          {
            $group: groupQuery,
          },
        ],
      },
    },
    {
      $project: {
        Startup: ["$Startup"],
        Investor: ["$Investor"],
        Accelerator: ["$Accelerator"],
        Individual: ["$Individual"],
        Mentor: ["$Mentor"],
        GovernmentBody: ["$GovernmentBody"],
        Incubator: ["$Incubator"],
        WomenOwned: ["$WomenOwned"],
        SeedFunded: ["$SeedFunded"],
        TaxExempted: ["$TaxExempted"],
        DpiitCertified: ["$DpiitCertified"],
        ShowcasedStartups: ["$ShowcasedStartups"],
        PatentStartup: ["$PatentStartup"],
      },
    },
  ];

  let promAllV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateMultiFieldCountsForStateV3 :: " + err.message);
    }
  });
  return Promise.all([promAllV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateMultiFieldCountsForCountryV3(from, to, body) {
  let matchQuery = {
    countryName: "India",
    profileRegisteredOn: { $lte: to, $gte: from },
  };
  matchQuery = addAdditionalMatchConditions(matchQuery, body);
  const groupQuery = {
    _id: { stateId: "$stateId", state: "$stateName" },
    count: { $sum: 1 },
  };
  let startupQ = { role: "Startup", dpiitCertified: true };
  let investorQ = { role: "Investor" };
  let acceleratorQ = { role: "Accelerator" };
  let individualQ = { role: "Individual" };
  let mentorQ = { role: "Mentor" };
  let govBodyQ = { role: "GovernmentBody" };
  let incubatorQ = { role: "Incubator" };
  let womenOwnedQ = { womenOwned: true, dpiitCertified: true };
  let seedFundedQ = { seedFunded: true, dpiitCertified: true };
  let taxExemptedQ = { taxExempted: true, dpiitCertified: true };
  let dpiitCertifiedQ = { dpiitCertified: true };
  let showcasedQ = { showcased: true, dpiitCertified: true };
  let patentedQ = { patented: true, dpiitCertified: true };

  let query = [
    { $match: matchQuery },
    {
      $facet: {
        Startup: [{ $match: startupQ }, { $group: groupQuery }],
        Investor: [{ $match: investorQ }, { $group: groupQuery }],
        Accelerator: [{ $match: acceleratorQ }, { $group: groupQuery }],
        Individual: [{ $match: individualQ }, { $group: groupQuery }],
        Mentor: [{ $match: mentorQ }, { $group: groupQuery }],
        GovernmentBody: [{ $match: govBodyQ }, { $group: groupQuery }],
        Incubator: [{ $match: incubatorQ }, { $group: groupQuery }],
        WomenOwned: [{ $match: womenOwnedQ }, { $group: groupQuery }],
        SeedFunded: [{ $match: seedFundedQ }, { $group: groupQuery }],
        TaxExempted: [{ $match: taxExemptedQ }, { $group: groupQuery }],
        DpiitCertified: [{ $match: dpiitCertifiedQ }, { $group: groupQuery }],
        ShowcasedStartups: [{ $match: showcasedQ }, { $group: groupQuery }],
        PatentStartup: [{ $match: patentedQ }, { $group: groupQuery }],
      },
    },
    {
      $project: {
        Startup: ["$Startup"],
        Investor: ["$Investor"],
        Accelerator: ["$Accelerator"],
        Individual: ["$Individual"],
        Mentor: ["$Mentor"],
        GovernmentBody: ["$GovernmentBody"],
        Incubator: ["$Incubator"],
        WomenOwned: ["$WomenOwned"],
        SeedFunded: ["$SeedFunded"],
        TaxExempted: ["$TaxExempted"],
        DpiitCertified: ["$DpiitCertified"],
        ShowcasedStartups: ["$ShowcasedStartups"],
        PatentStartup: ["$PatentStartup"],
      },
    },
  ];

  console.log(JSON.stringify(query));

  let promAllCV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateMultiFieldCountsForCountryV3 :: " + err.message);
    }
  });
  return Promise.all([promAllCV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateMultiFieldCountsForCountry(from, to) {
  const groupQuery = {
    _id: {
      stateId: "$stateId",
      state: "$stateName",
      districtId: "$districtId",
      district: "$districtName",
    },
    count: { $sum: 1 },
  };
  const profileRegisteredRange = { $lte: to, $gte: from };
  let query = [
    {
      $match: {
        countryName: "India",
        profileRegisteredOn: profileRegisteredRange,
      },
    },
    {
      $facet: {
        Startup: [
          { $match: { role: "Startup", dpiitCertified: true } },
          { $group: groupQuery },
        ],
        Investor: [{ $match: { role: "Investor" } }, { $group: groupQuery }],
        Accelerator: [
          { $match: { role: "Accelerator" } },
          { $group: groupQuery },
        ],
        Individual: [
          { $match: { role: "Individual" } },
          { $group: groupQuery },
        ],
        Mentor: [{ $match: { role: "Mentor" } }, { $group: groupQuery }],
        GovernmentBody: [
          { $match: { role: "GovernmentBody" } },
          { $group: groupQuery },
        ],
        Incubator: [{ $match: { role: "Incubator" } }, { $group: groupQuery }],
        WomenOwned: [
          { $match: { womenOwned: true, dpiitCertified: true } },
          { $group: groupQuery },
        ],
        SeedFunded: [
          { $match: { seedFunded: true, dpiitCertified: true } },
          { $group: groupQuery },
        ],
        TaxExempted: [
          { $match: { taxExempted: true, dpiitCertified: true } },
          { $group: groupQuery },
        ],
        DpiitCertified: [
          { $match: { dpiitCertified: true } },
          { $group: groupQuery },
        ],

        ShowcasedStartups: [
          { $match: { showcased: true, dpiitCertified: true } },
          { $group: groupQuery },
        ],
        PatentStartup: [
          { $match: { patented: { $eq: true } } },
          { $group: groupQuery },
        ],
      },
    },
    {
      $project: {
        Startup: ["$Startup"],
        Investor: ["$Investor"],
        Accelerator: ["$Accelerator"],
        Individual: ["$Individual"],
        Mentor: ["$Mentor"],
        GovernmentBody: ["$GovernmentBody"],
        Incubator: ["$Incubator"],
        WomenOwned: ["$WomenOwned"],
        SeedFunded: ["$SeedFunded"],
        TaxExempted: ["$TaxExempted"],
        DpiitCertified: ["$DpiitCertified"],
        ShowcasedStartups: ["$ShowcasedStartups"],
        PatentStartup: ["$PatentStartup"],
      },
    },
  ];

  var promAllCountry = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateMultiFieldCountsForCountry :: " + err.message);
    }
  });
  return Promise.all([promAllCountry])
    .then((values) => {
      // console.log("populateMultiFieldCountsForCountry : All promises resolved - " + values.length);
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function processStatewiseResults(data) {
  var o = {};
  for (let i = 0; i < data.length; i++) {
    let obj = data[i];
    o[obj._id.StateId] = obj.count;
  }
  return o;
}

function addAdditionalMatchConditions(subQuery, data) {
  if (data.hasOwnProperty("stages") && data.stages.length) {
    subQuery.stage = {
      $in: data.stages,
    };
  }

  if (data.hasOwnProperty("industries") && data.industries.length) {
    let inds = [];
    for (let ind of data.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }

  if (data.hasOwnProperty("sectors") && data.sectors.length) {
    let secs = [];
    for (let sec of data.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  return subQuery;
}

function fillUndefined(value) {
  return _.isUndefined(value) ? 0 : value;
}

router.post(
  "/stats1/:geographicalEntity/:entityId/:from/:to",
  async (req, resp) => {
    // #swagger.tags = ['Data Tables']
    // #swagger.path = '/data/v2/statis/{geographicalEntity}/{entityId}/{from}/{to}'
    // #swagger.exmaple = '/data/v2/statis/country/5f02e38c6f3de87babe20cd2/{from}/{to}'
    // #swagger.description = 'State-wise data table'
    /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$stages": ["Scaling", "EarlyTraction", "Validation"],
        }
    } */
    // console.log("Data Table request - " + JSON.stringify(req.body));

    var output = {};
    output.from = req.params.from;
    output.to = req.params.to;

    const from = new Date(req.params.from);
    const to = new Date(req.params.to);

    if (
      (!_.isEmpty(req.params.from) && !_.isEmpty(req.params.to)) ||
      (moment(req.params.from, "YYYY-MM-DD", true).isValid() &&
        moment(req.params.to, "YYYY-MM-DD", true).isValid())
    ) {
      console.log("Valid dates passed.");
    } else {
      resp
        .status(500)
        .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
    }

    let subQuery = {};
    subQuery.profileRegisteredOn = {
      $lte: to,
      $gte: from,
    };
    // resp.send(JSON.stringify(req.params));
    var result = [];
    if (req.params.geographicalEntity == "country") {
      // Country - India level
      let countryCounts = await populateStats1Country(from, to, req.body);

      let map = new Map();
      // items = states
      let items = Object.keys(countryCounts);
      for (let i = 0; i < items.length; i++) {
        let key = items[i];
        let v = countryCounts[key].length ? countryCounts[key][0] : [];

        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;

          if (map.has(x.stateId)) {
            let countData = map.get(x.stateId);
            countData.statistics[key] = c;
            map.set(x.stateId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountMap));
            placeholder[key] = c;
            let data = {};
            data.stateId = x.stateId;
            data.state = x.state;
            data.statistics = placeholder;
            map.set(x.stateId, data);
          }
        }
      }
      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let state = {};
        let count = JSON.parse(JSON.stringify(dataCountMap));

        state.stateId = key;
        state.id = key;
        state.state = val.state;
        state.name = val.state;
        state.text = val.state;

        count.Startup = fillUndefined(val.statistics.Startup);
        count.Mentor = fillUndefined(val.statistics.Mentor);
        count.Incubator = fillUndefined(val.statistics.Incubator);
        count.Investor = fillUndefined(val.statistics.Investor);
        count.Individual = fillUndefined(val.statistics.Individual);
        count.GovernmentBody = fillUndefined(val.statistics.GovernmentBody);
        count.Accelerator = fillUndefined(val.statistics.Accelerator);

        state.statistics = count;
        countsArr.push(state);
      }
      output.data = countsArr;
      resp.status(200).send(output);
    } else if (req.params.geographicalEntity == "state") {
      // State level
      let stateId = req.params.entityId;
      // console.log('stateId =',stateId);

      let stateCounts = await populateStats1State(stateId, from, to, req.body);
      // resp.send(JSON.stringify(stateCounts));
      let map = new Map();
      // items = districts
      let items = Object.keys(stateCounts);
      for (let i = 0; i < items.length; i++) {
        let key = items[i];
        let v = stateCounts[key].length ? stateCounts[key][0] : [];
        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;

          if (map.has(x.districtId)) {
            let countData = map.get(x.districtId);
            countData.statistics[key] = c;
            map.set(x.districtId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountMap));
            placeholder[key] = c;
            let data = {};
            data.districtId = x.districtId;
            data.district = x.district;
            data.stateId = x.stateId;
            data.state = x.state;
            data.statistics = placeholder;
            map.set(x.districtId, data);
          }
        }
      }

      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let district = {};
        let count = JSON.parse(JSON.stringify(dataCountMap));

        district.districtId = key;
        district.district = val.district;
        district.stateId = val.stateId;
        district.state = val.state;

        count.Startup = fillUndefined(val.statistics.Startup);
        count.Mentor = fillUndefined(val.statistics.Mentor);
        count.Incubator = fillUndefined(val.statistics.Incubator);
        count.Investor = fillUndefined(val.statistics.Investor);
        count.Individual = fillUndefined(val.statistics.Individual);
        count.GovernmentBody = fillUndefined(val.statistics.GovernmentBody);
        count.Accelerator = fillUndefined(val.statistics.Accelerator);

        district.statistics = count;
        countsArr.push(district);
      }
      output.data = countsArr;
      resp.status(200).send(output);
    } else {
      // City/District level
    }
  }
);

router.post(
  "/stats2/:geographicalEntity/:entityId/:from/:to",
  async (req, resp) => {
    // #swagger.tags = ['Data Tables']
    // #swagger.path = '/data/v2/statis/{geographicalEntity}/{entityId}/{from}/{to}'
    // #swagger.exmaple = '/data/v2/statis/country/5f02e38c6f3de87babe20cd2/{from}/{to}'
    // #swagger.description = 'State-wise data table'
    /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$stages": ["Scaling", "EarlyTraction", "Validation"],
        }
    } */
    // console.log("Data Table request - " + JSON.stringify(req.body));

    var output = {};
    output.from = req.params.from;
    output.to = req.params.to;

    const from = new Date(req.params.from);
    const to = new Date(req.params.to);

    if (
      (!_.isEmpty(req.params.from) && !_.isEmpty(req.params.to)) ||
      (moment(req.params.from, "YYYY-MM-DD", true).isValid() &&
        moment(req.params.to, "YYYY-MM-DD", true).isValid())
    ) {
      console.log("Valid dates passed.");
    } else {
      resp
        .status(500)
        .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
    }

    let subQuery = {};
    subQuery.profileRegisteredOn = {
      $lte: to,
      $gte: from,
    };
    // resp.send(JSON.stringify(req.params));
    var result = [];
    if (req.params.geographicalEntity == "country") {
      // Country - India level
      let countryCounts = await populateStats2Country(from, to, req.body);

      let map = new Map();

      //Get all keys i.e. statistics received
      let items = Object.keys(countryCounts);

      for (let i = 0; i < items.length; i++) {
        let key = items[i];
        let v = countryCounts[key].length ? countryCounts[key][0] : [];

        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;

          if (map.has(x.stateId)) {
            let countData = map.get(x.stateId);
            countData.statistics[key] = c;
            map.set(x.stateId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountOthers));
            placeholder[key] = c;
            let data = {};
            data.stateId = x.stateId;
            data.state = x.state;
            data.statistics = placeholder;
            map.set(x.stateId, data);
          }
        }
      }

      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let state = {};
        let count = JSON.parse(JSON.stringify(dataCountOthers));

        state.stateId = key;
        state.id = key;
        state.state = val.state;
        state.name = val.state;
        state.text = val.state;

        count.DpiitCertified = fillUndefined(val.statistics.dpiitCertified);
        count.ShowcasedStartups = fillUndefined(val.statistics.showcased);
        count.SeedFunded = fillUndefined(val.statistics.seedFunded);
        count.Patented = fillUndefined(val.statistics.patented);
        count.WomenLed = fillUndefined(val.statistics.womenOwned);
        count.LeadingSector = fillUndefined(val.statistics.leadingSector);
        count.DeclaredRewards = fillUndefined(val.statistics.declaredRewards);
        // count.TaxExempted = fillUndefined(val.statistics.TaxExempted);

        state.statistics = count;
        countsArr.push(state);
      }
      output.data = countsArr;
      resp.status(200).send(output);
    } else if (req.params.geographicalEntity == "state") {
      // State level
      let stateId = req.params.entityId;
      // console.log('stateId =',stateId);

      let stateCounts = await populateStats2State(stateId, from, to, req.body);
      // resp.send(JSON.stringify(stateCounts));
      let map = new Map();
      // items = districts
      let items = Object.keys(stateCounts);
      for (let i = 0; i < items.length; i++) {
        let key = items[i];
        let v = stateCounts[key].length ? stateCounts[key][0] : [];
        for (let j = 0; j < v.length; j++) {
          let x = v[j];
          let c = x.count;
          x = x._id;

          if (map.has(x.districtId)) {
            let countData = map.get(x.districtId);
            countData.statistics[key] = c;
            map.set(x.districtId, countData);
          } else {
            let placeholder = JSON.parse(JSON.stringify(dataCountOthers));
            placeholder[key] = c;
            let data = {};
            data.districtId = x.districtId;
            data.district = x.district;
            data.stateId = x.stateId;
            data.state = x.state;
            data.statistics = placeholder;
            map.set(x.districtId, data);
          }
        }
      }

      let countsArr = [];
      for (let [key, val] of map.entries()) {
        let district = {};
        let count = JSON.parse(JSON.stringify(dataCountOthers));

        district.districtId = key;
        district.district = val.district;
        district.stateId = val.stateId;
        district.state = val.state;

        count.DpiitCertified = fillUndefined(val.statistics.dpiitCertified);
        count.ShowcasedStartups = fillUndefined(val.statistics.showcased);
        count.SeedFunded = fillUndefined(val.statistics.seedFunded);
        count.Patented = fillUndefined(val.statistics.patented);
        count.WomenLed = fillUndefined(val.statistics.womenOwned);
        count.LeadingSector = fillUndefined(val.statistics.leadingSector);
        count.DeclaredRewards = fillUndefined(val.statistics.declaredRewards);
        // count.TaxExempted = fillUndefined(val.statistics.TaxExempted);

        district.statistics = count;
        countsArr.push(district);
      }
      output.data = countsArr;
      resp.status(200).send(output);
    } else {
      // City/District level
    }
  }
);

async function populateStats1Country(from, to, body) {
  let subQuery = { profileRegisteredOn: { $lte: to, $gte: from } };

  if (body.hasOwnProperty("states") && body.states.length) {
    let states = [];
    for (let state of body.states) {
      states.push(new ObjectId(state));
    }
    subQuery["stateId"] = {
      $in: body.states,
    };
  }

  if (body.hasOwnProperty("stages") && body.stages.length) {
    subQuery.stage = {
      $in: body.stages,
    };
  }

  if (body.hasOwnProperty("industries") && body.industries.length) {
    let inds = [];
    for (let ind of body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }

  if (body.hasOwnProperty("sectors") && body.sectors.length) {
    let secs = [];
    for (let sec of body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  const facetArr = [
    "Startup",
    "Investor",
    "Accelerator",
    "Mentor",
    "GovernmentBody",
    "Incubator",
  ];

  const groupQuery = {
    _id: { stateId: "$stateId", state: "$stateName" },
    count: { $sum: 1 },
  };

  let facetMap = new Map();
  facetArr.forEach((e) =>
    facetMap.set(e, [{ $match: { role: { $eq: e } } }, { $group: groupQuery }])
  );
  let facetQuery = Object.fromEntries(facetMap);

  let projectMap = new Map();
  facetArr.forEach((e) => projectMap.set(e, [`$${e}`, 0]));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [];
  query.push({ $match: subQuery });
  query.push({ $facet: facetQuery });
  query.push({ $project: projectQuery });

  let promAllCV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateStats1Country :: " + err.message);
    }
  });
  return Promise.all([promAllCV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateStats1State(stateId, from, to, body) {
  let subQuery = {
    profileRegisteredOn: { $lte: to, $gte: from },
    stateId: { $eq: stateId },
  };
  if (body.hasOwnProperty("stages") && body.stages.length) {
    subQuery.stage = {
      $in: body.stages,
    };
  }
  if (body.hasOwnProperty("industries") && body.industries.length) {
    let inds = [];
    for (let ind of body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }
  if (body.hasOwnProperty("sectors") && body.sectors.length) {
    let secs = [];
    for (let sec of body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  const facetArr = [
    "Startup",
    "Investor",
    "Accelerator",
    "Mentor",
    "GovernmentBody",
    "Incubator",
  ];

  const groupQuery = {
    _id: {
      stateId: "$stateId",
      state: "$stateName",
      districtId: "$districtId",
      district: "$districtName",
    },
    count: { $sum: 1 },
  };

  let facetMap = new Map();
  facetArr.forEach((e) =>
    facetMap.set(e, [{ $match: { role: { $eq: e } } }, { $group: groupQuery }])
  );
  let facetQuery = Object.fromEntries(facetMap);

  let projectMap = new Map();
  facetArr.forEach((e) => projectMap.set(e, [`$${e}`, 0]));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [];
  query.push({ $match: subQuery });
  query.push({ $facet: facetQuery });
  query.push({ $project: projectQuery });

  let promAllV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateStats1State :: " + err.message);
    }
  });
  return Promise.all([promAllV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateStats2Country(from, to, body) {
  let subQuery = {
    role: { $eq: "Startup" },
    profileRegisteredOn: { $lte: to, $gte: from },
  };

  if (body.hasOwnProperty("states") && body.states.length) {
    let states = [];
    for (let state of body.states) {
      states.push(new ObjectId(state));
    }
    subQuery["stateId"] = {
      $in: body.states,
    };
  }

  if (body.hasOwnProperty("stages") && body.stages.length) {
    subQuery.stage = {
      $in: body.stages,
    };
  }

  if (body.hasOwnProperty("industries") && body.industries.length) {
    let inds = [];
    for (let ind of body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }

  if (body.hasOwnProperty("sectors") && body.sectors.length) {
    let secs = [];
    for (let sec of body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  const facetArr = [
    "dpiitCertified",
    "showcased",
    "seedFunded",
    "patented",
    "womenOwned",
    "leadingSector",
    "declaredRewards",
  ];

  const groupQuery = {
    _id: { stateId: "$stateId", state: "$stateName" },
    count: { $sum: 1 },
  };

  let facetMap = new Map();
  facetArr.forEach((e) =>
    facetMap.set(e, [
      { $match: { [e]: { $eq: true } } },
      { $group: groupQuery },
    ])
  );
  let facetQuery = Object.fromEntries(facetMap);

  let projectMap = new Map();
  facetArr.forEach((e) => projectMap.set(e, [`$${e}`, 0]));
  let projectQuery = Object.fromEntries(projectMap);
  console.log(projectQuery);

  let query = [];
  query.push({ $match: subQuery });
  query.push({ $facet: facetQuery });
  query.push({ $project: projectQuery });
  // console.log(query)
  let promAllCV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateStats2Country :: " + err.message);
    }
  });
  return Promise.all([promAllCV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateStats1State(stateId, from, to, body) {
  let subQuery = {
    profileRegisteredOn: { $lte: to, $gte: from },
    stateId: { $eq: stateId },
  };
  if (body.hasOwnProperty("stages") && body.stages.length) {
    subQuery.stage = {
      $in: body.stages,
    };
  }
  if (body.hasOwnProperty("industries") && body.industries.length) {
    let inds = [];
    for (let ind of body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }
  if (body.hasOwnProperty("sectors") && body.sectors.length) {
    let secs = [];
    for (let sec of body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  const facetArr = [
    "Startup",
    "Investor",
    "Accelerator",
    "Mentor",
    "GovernmentBody",
    "Incubator",
  ];

  const groupQuery = {
    _id: {
      stateId: "$stateId",
      state: "$stateName",
      districtId: "$districtId",
      district: "$districtName",
    },
    count: { $sum: 1 },
  };

  let facetMap = new Map();
  facetArr.forEach((e) =>
    facetMap.set(e, [{ $match: { role: { $eq: e } } }, { $group: groupQuery }])
  );
  let facetQuery = Object.fromEntries(facetMap);

  let projectMap = new Map();
  facetArr.forEach((e) => projectMap.set(e, [`$${e}`, 0]));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [];
  query.push({ $match: subQuery });
  query.push({ $facet: facetQuery });
  query.push({ $project: projectQuery });

  let promAllV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateStats1State :: " + err.message);
    }
  });
  return Promise.all([promAllV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

async function populateStats2State(stateId, from, to, body) {
  let subQuery = {
    profileRegisteredOn: { $lte: to, $gte: from },
    stateId: { $eq: stateId },
  };
  if (body.hasOwnProperty("stages") && body.stages.length) {
    subQuery.stage = {
      $in: body.stages,
    };
  }
  if (body.hasOwnProperty("industries") && body.industries.length) {
    let inds = [];
    for (let ind of body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }
  if (body.hasOwnProperty("sectors") && body.sectors.length) {
    let secs = [];
    for (let sec of body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  const facetArr = [
    "dpiitCertified",
    "showcased",
    "seedFunded",
    "patented",
    "womenOwned",
    "leadingSector",
    "declaredRewards",
  ];

  const groupQuery = {
    _id: {
      stateId: "$stateId",
      state: "$stateName",
      districtId: "$districtId",
      district: "$districtName",
    },
    count: { $sum: 1 },
  };

  let facetMap = new Map();
  facetArr.forEach((e) =>
    facetMap.set(e, [
      { $match: { [e]: { $eq: true } } },
      { $group: groupQuery },
    ])
  );

  let facetQuery = Object.fromEntries(facetMap);

  let projectMap = new Map();
  facetArr.forEach((e) => projectMap.set(e, [`$${e}`, 0]));
  let projectQuery = Object.fromEntries(projectMap);

  let query = [];
  query.push({ $match: subQuery });
  query.push({ $facet: facetQuery });
  query.push({ $project: projectQuery });

  let promAllV3 = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query)
        .toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error("populateStats2State :: " + err.message);
    }
  });
  return Promise.all([promAllV3])
    .then((values) => {
      // console.log("All promises resolved - " + JSON.stringify(values));
      return values[0];
    })
    .catch((reason) => {
      console.log(reason);
    });
}

module.exports = router;
