const express = require("express");
var cron = require("node-cron");
const request = require("request");
const fs = require("fs");
const router = express.Router();
var _ = require("lodash/core");
const mongodb = require("../mongodb");
const { resolve } = require("path");

var stateWiseCount = fs.readFileSync("./static/stateWiseCount.json", "utf8");
stateWiseCount = JSON.parse(stateWiseCount);
var stateIdNameMap = fs.readFileSync("./static/stateIdNameMap.json", "utf8");
stateIdNameMap = JSON.parse(stateIdNameMap);
var stateMap = fs.readFileSync("./static/stateMap.json", "utf8");
stateMap = JSON.parse(stateMap);
var womenLedStartups = fs.readFileSync(
  "./static/womenLedStartups.json",
  "utf8"
);
womenLedStartups = JSON.parse(womenLedStartups);
var blankFilterQuery = fs.readFileSync(
  "./static/blankFilterQuery.json",
  "utf8"
);
blankFilterQuery = JSON.parse(blankFilterQuery);

var stateCountJson = {
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

router.get("/triggerCron", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/triggerCron'
  // #swagger.description = 'DO NOT USE - Trigger all crons'
  var task = cron.schedule(
    //"0 5 * * *",
    "* * * * *",
    async () => {
      console.log("Executing scheduled cron at - " + new Date());
      //populateStateIdNameMap();
      //populateWomenLedStartupMap();
      //prepareStateWiseCounts();

      await populateStateIdNameMapV2();
      await populateWomenLedStartupMapV2();
      await populateTaxExemptedStartupMap();
      await populateDpiitRecognizedStartupMap();
      await prepareStateWiseCountsV2();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );
  resp.json("DONE");
});

router.get("/populateStateIdNameMap", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/populateStateIdNameMap'
  // #swagger.description = 'DO NOT USE - Manual Job to populate StateId-Name Map'

  //populateStateIdNameMap();
  populateStateIdNameMapV2();
  resp.json("DONE");
});

router.get("/prepareStateWiseCounts", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/prepareStateWiseCounts'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare State-Wise Counts'

  prepareStateWiseCountsV2();
  resp.json("DONE");
});

router.get("/populateWomenLedStartupMap", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/populateWomenLedStartupMap'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare State-Wise Women Led startup Counts'

  //populateWomenLedStartupMap();
  populateWomenLedStartupMapV2();
  resp.json("DONE");
});

router.get("/populateTaxExemptedStartupMap", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/populateTaxExemptedStartupMap'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare State-Wise Tax Exmpted startup Counts'

  populateTaxExemptedStartupMap();
  resp.json("DONE");
});

router.get("/populateDpiitRecognizedStartupMap", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/populateDpiitRecognizedStartupMap'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare State-Wise Dpiit Certified startup Counts'

  populateDpiitRecognizedStartupMap();
  resp.json("DONE");
});

router.get("/prepareIndiaLevelCounts", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/prepareIndiaLevelCounts'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare India level Counts'

  //prepareIndiaLevelCounts();
  prepareIndiaLevelCountsV2();
  resp.json("DONE");
});

router.get("/prepareStateCityMap", (req, resp) => {
  // #swagger.tags = ['Jobs']
  // #swagger.path = '/jobs/prepareStateCityMap'
  // #swagger.description = 'DO NOT USE - Manual Job to prepare State to City Map'

  prepareStateCityMap();
  resp.json("DONE");
});

async function prepareStateCityMap() {
  // Pre-process State to City Map
  var stateArr = Object.keys(stateMap);
  var stateCityMap = fs.readFileSync("./static/stateCityMap.json", "utf8");
  stateCityMap = JSON.parse(stateCityMap);

  for (let i = 0, l = stateArr.length; i < l; i++) {
    request(
      process.env.DISTRICT_URL + stateArr[i],
      { json: true },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        stateCityMap[stateArr[i]] = res.body.data;
        fs.writeFileSync(
          "./static/stateCityMap.json",
          JSON.stringify(stateCityMap, null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("Data written successfully!");
          }
        );
      }
    );
  }
}

async function populateStateIdNameMap() {
  // Pre-process State List
  request(process.env.STATES_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log("Running a job every minute at Asia/Kolkata timezone");
    var apiData = res.body.data;

    fs.writeFileSync(
      "./static/stateIdNameMap.json",
      JSON.stringify(apiData, null, 4),
      function (err) {
        if (err) {
          return console.error(err);
        }
        console.log("Data written successfully!");
      }
    );
  });
}

async function populateStateIdNameMapV2() {
  // Pre-process State List
  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          "$group": {
            "_id": "$stateId",
            "name": { "$first": "$stateName" },
            "text": { "$first": "$stateName" },
          },
        },
      ]).toArray((err, result) => {
        if (err) throw err;
        result = result.filter(s => s._id != null);
        fs.writeFileSync(
          "./static/stateIdNameMap.json",
          JSON.stringify(result, null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("populateStateIdNameMapV2 :: Data written successfully!");
          }
        );
      });
  } catch (err) {
    console.error('populateStateIdNameMapV2 :: ' + err.message);
  }
}

async function populateWomenLedStartupMap() {
  // Pre-process Women Led startups
  request(
    process.env.WOMEN_LED_STARTUPS_URL,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(
        "populateWomenLedStartupMap :: Running a job every minute at Asia/Kolkata timezone"
      );
      var apiData = res.body.data;
      var output = {};
      for (let i = 0, l = apiData.length; i < l; i++) {
        var state = apiData[i];
        output[state.stateId] = state.totalCount;
      }

      fs.writeFileSync(
        "./static/womenLedStartups.json",
        JSON.stringify(output, null, 4),
        function (err) {
          if (err) {
            return console.error(err);
          }
          console.log("Women Led startup data written successfully!");
        }
      );
    }
  );
}

async function populateWomenLedStartupMapV2() {
  // Pre-process Women Led startups
  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          "$match": {
            "womenOwned": { "$eq": true }
          },
        },
        {
          "$group": {
            "_id": {
              "StateId": "$stateId",
            }, "count": { "$sum": 1 },
          },
        },
      ]).toArray((err, result) => {
        if (err) throw err;
        //console.log("* Output - " + JSON.stringify(result));

        fs.writeFileSync(
          "./static/womenLedStartups.json",
          JSON.stringify(processStatewiseResults(result), null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("populateWomenLedStartupMapV2 :: Women Led startup data written successfully!");
          }
        );
      });
  } catch (err) {
    console.error('populateWomenLedStartupMapV2 :: ' + err.message);
  }
}

async function populateTaxExemptedStartupMap() {
  // Pre-process Tax Exempted startups
  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          "$match": {
            "taxExempted": { "$eq": true }
          },
        },
        {
          "$group": {
            "_id": {
              "StateId": "$stateId",
            }, "count": { "$sum": 1 },
          },
        },
      ]).toArray((err, result) => {
        if (err) throw err;
        //console.log("* Output - " + JSON.stringify(result));

        fs.writeFileSync(
          "./static/taxExemptedStartups.json",
          JSON.stringify(processStatewiseResults(result), null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("populateTaxExemptedStartupMap :: Tax Exempted startup data written successfully!");
          }
        );
      });
  } catch (err) {
    console.error('populateTaxExemptedStartupMap :: ' + err.message);
  }
}

async function populateDpiitRecognizedStartupMap() {
  // Pre-process Dpiit Recognized startups
  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          "$match": {
            "dpiitCertified": { "$eq": true }
          },
        },
        {
          "$group": {
            "_id": {
              "StateId": "$stateId",
            }, "count": { "$sum": 1 },
          },
        },
      ]).toArray((err, result) => {
        if (err) throw err;
        //console.log("* Output - " + JSON.stringify(result));

        fs.writeFileSync(
          "./static/dpiitCertifiedStartups.json",
          JSON.stringify(processStatewiseResults(result), null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("populateDpiitRecognizedStartupMap :: Dpiit Recognized startup data written successfully!");
          }
        );
      });
  } catch (err) {
    console.error('populateDpiitRecognizedStartupMap :: ' + err.message);
  }
}

async function prepareIndiaLevelCounts() {
  // Pre-process India Wise counts
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
    body: JSON.stringify(blankFilterQuery),
  };

  request(options, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    var facetResult = JSON.parse(body).facetResultPages;
    var industryBasedNumbers = facetResult[0].content;
    var sectorBasedNumbers = facetResult[1].content;
    var roleBasedNumbers = facetResult[5].content;
    var stageBasedNumbers = facetResult[6].content;

    var template = JSON.parse(JSON.stringify(stateCountJson));
    for (const role of roleBasedNumbers) {
      template[role.value] = role.valueCount;
    }
    template.DpiitCertified = _.isUndefined(
      facetResult[8].content[1].valueCount
    )
      ? 0
      : facetResult[8].content[1].valueCount;
    template.TaxExempted = _.isUndefined(facetResult[9].content[1])
      ? 0
      : facetResult[9].content[1].valueCount;
    template.WomenLed = Object.values(womenLedStartups).reduce((a, b) => {
      return a + b;
    });

    // Storing Industries
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
    template.industry = industryArr;
    template.TotalIndustry = totalIndustriesOfState;

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
    template.sector = sectorArr;
    template.TotalSector = totalSectorsOfState;

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
    template.stage = stageArr;
    template.TotalStage = totalStagesOfState;

    fs.writeFileSync(
      "./static/IndiaWiseCount.json",
      JSON.stringify(template, null, 4),
      function (err) {
        if (err) {
          return console.error(err);
        }
        console.log("Data written successfully for India");
      }
    );
  });
}

async function prepareIndiaLevelCountsV2() {
  // Pre-process India Wise counts
  let facetResult = await populateMultiFieldCountsForIndiaWithoutDate();
  let industryBasedNumbers = facetResult.Industry[0];
  let sectorBasedNumbers = facetResult.Sector[0];
  let stageBasedNumbers = facetResult.Stage[0];

  let template = JSON.parse(JSON.stringify(stateCountJson));
  template.Mentor = fillUndefined(facetResult.Mentor);
  template.GovernmentBody = fillUndefined(facetResult.GovernmentBody);
  template.Individual = fillUndefined(facetResult.Individual);
  template.Investor = fillUndefined(facetResult.Investor);
  template.Startup = fillUndefined(facetResult.Startup);
  template.Accelerator = fillUndefined(facetResult.Accelerator);
  template.DpiitCertified = fillUndefined(facetResult.DpiitCertified);
  template.TaxExempted = fillUndefined(facetResult.TaxExempted);
  template.WomenLed = fillUndefined(facetResult.WomenOwned);
  template.PatentStartup = fillUndefined(facetResult.PatentStartup);
  template.SeedFundStartup = fillUndefined(facetResult.SeedFunded);
  template.ShowcasedStartups = fillUndefined(facetResult.ShowcasedStartups);

  // Storing Industries
  let industryArr = [];
  let totalIndustriesOfState = 0;
  for (const ind of industryBasedNumbers) {
    industryArr.push({
      id: ind._id.industry._id,
      text: ind._id.industry.name,
      count: ind.count,
    });
    totalIndustriesOfState += ind.count;
  }
  template.industry = industryArr;
  template.TotalIndustry = totalIndustriesOfState;

  // Storing Sectors
  let sectorArr = [];
  let totalSectorsOfState = 0;
  for (const sec of sectorBasedNumbers) {
    sectorArr.push({
      id: sec._id.sector._id,
      text: sec._id.sector.name,
      count: sec.count,
    });
    totalSectorsOfState += sec.count;
  }
  template.sector = sectorArr;
  template.TotalSector = totalSectorsOfState;

  // Storing Stages
  let stageArr = [];
  let totalStagesOfState = 0;
  for (const stg of stageBasedNumbers) {
    stageArr.push({
      id: stg._id.stage,
      text: stg._id.stage,
      count: stg.count,
    });
    totalStagesOfState += stg.count;
  }
  template.stage = stageArr;
  template.TotalStage = totalStagesOfState;

  fs.writeFileSync(
    "./static/IndiaWiseCount.json",
    JSON.stringify(template, null, 4),
    function (err) {
      if (err) {
        return console.error(err);
      }
      console.log("Data written successfully for India");
    }
  );
}

async function prepareStateWiseCounts() {
  // Pre-process State Wise counts
  request(process.env.STATES_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }

    var maxStartups = 0;
    var maxMentors = 0;
    var maxIncubators = 0;
    var maxAccelarators = 0;
    var maxCorporates = 0;
    var maxInvestors = 0;
    var maxGovernmentBodys = 0;

    for (let i = 0, l = stateIdNameMap.length; i < l; i++) {
      var query = JSON.parse(JSON.stringify(blankFilterQuery));
      let currentState = stateIdNameMap[i];
      console.log(
        "prepareStateWiseCounts :: Processing for " + currentState.name
      );
      query.states = [currentState.id];

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
        var facetResult = JSON.parse(body).facetResultPages;
        var industryBasedNumbers = facetResult[0].content;
        var sectorBasedNumbers = facetResult[1].content;
        var roleBasedNumbers = facetResult[5].content;
        var stageBasedNumbers = facetResult[6].content;

        var stateDetailsObj = {};
        var stateDetails = fs.readFileSync(
          "./static/stateWiseCount.json",
          "utf8"
        );
        stateDetails = JSON.parse(stateDetails);

        var template = JSON.parse(JSON.stringify(stateCountJson));
        for (const role of roleBasedNumbers) {
          template[role.value] = role.valueCount;
        }
        template.DpiitCertified = _.isUndefined(
          facetResult[8].content[1].valueCount
        )
          ? 0
          : facetResult[8].content[1].valueCount;
        template.TaxExempted = _.isUndefined(facetResult[9].content[1])
          ? 0
          : facetResult[9].content[1].valueCount;
        template.WomenLed = womenLedStartups[currentState.id];

        // Storing statistics
        stateDetailsObj.statistics = template;

        // Storing Industries
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
        stateDetailsObj.industry = industryArr;
        stateDetailsObj.TotalIndustry = totalIndustriesOfState;

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
        stateDetailsObj.sector = sectorArr;
        stateDetailsObj.TotalSector = totalSectorsOfState;

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
        stateDetailsObj.stage = stageArr;
        stateDetailsObj.TotalStage = totalStagesOfState;

        stateDetails[currentState.id] = stateDetailsObj;

        // Checking max counts
        stateDetails.maxStartups = maxStartups =
          template.Startup > maxStartups ? template.Startup : maxStartups;
        stateDetails.maxMentors = maxMentors =
          template.Mentor > maxMentors ? template.Mentor : maxMentors;
        stateDetails.maxIncubators = maxIncubators =
          template.Incubator > maxIncubators
            ? template.Incubator
            : maxIncubators;
        stateDetails.maxAccelarators = maxAccelarators =
          template.maxAccelarators > maxAccelarators
            ? template.maxAccelarators
            : maxAccelarators;
        stateDetails.maxCorporates = maxCorporates =
          template.Corporate > maxCorporates
            ? template.Corporate
            : maxCorporates;
        stateDetails.maxInvestors = maxInvestors =
          template.Investor > maxInvestors ? template.Investor : maxInvestors;
        stateDetails.maxGovernmentBodys = maxGovernmentBodys =
          template.GovernmentBody > maxGovernmentBodys
            ? template.GovernmentBody
            : maxGovernmentBodys;

        fs.writeFileSync(
          "./static/stateWiseCount.json",
          JSON.stringify(stateDetails, null, 4),
          function (err) {
            if (err) {
              return console.error(err);
            }
            console.log("Data written successfully for " + currentState.name);
          }
        );
      });
    }
  });
}

async function prepareStateWiseCountsV2() {
  // Pre-process State Wise counts
  stateIdNameMap = JSON.parse(fs.readFileSync("./static/stateIdNameMap.json", "utf8"));

  let maxStartups = 0;
  let maxMentors = 0;
  let maxIncubators = 0;
  let maxAccelarators = 0;
  let maxCorporates = 0;
  let maxInvestors = 0;
  let maxGovernmentBodys = 0;

  for (let i = 0, l = stateIdNameMap.length; i < l; i++) {
    let currentState = stateIdNameMap[i];
    console.log(
      "prepareStateWiseCountsV2 :: Processing for " + currentState.name
    );

    let facetResult = await populateMultiFieldCountsForStateWithoutDate(currentState._id);
    let industryBasedNumbers = facetResult.Industry[0];
    let sectorBasedNumbers = facetResult.Sector[0];
    let stageBasedNumbers = facetResult.Stage[0];

    let stateDetailsObj = {};
    let stateDetails = fs.readFileSync(
      "./static/stateWiseCount.json",
      "utf8"
    );
    stateDetails = JSON.parse(stateDetails);

    let template = JSON.parse(JSON.stringify(stateCountJson));
    template.Mentor = fillUndefined(facetResult.Mentor);
    template.GovernmentBody = fillUndefined(facetResult.GovernmentBody);
    template.Individual = fillUndefined(facetResult.Individual);
    template.Investor = fillUndefined(facetResult.Investor);
    template.Startup = fillUndefined(facetResult.Startup);
    template.Accelerator = fillUndefined(facetResult.Accelerator);
    template.DpiitCertified = fillUndefined(facetResult.DpiitCertified);
    template.TaxExempted = fillUndefined(facetResult.TaxExempted);
    template.WomenLed = fillUndefined(facetResult.WomenOwned);
    template.PatentStartup = fillUndefined(facetResult.PatentStartup);
    template.SeedFundStartup = fillUndefined(facetResult.SeedFunded);
    template.ShowcasedStartups = fillUndefined(facetResult.ShowcasedStartups);

    // Storing statistics
    stateDetailsObj.statistics = template;

    // Storing Industries
    let industryArr = [];
    let totalIndustriesOfState = 0;
    for (const ind of industryBasedNumbers) {
      industryArr.push({
        id: ind._id.industry._id,
        text: ind._id.industry.name,
        count: ind.count,
      });
      totalIndustriesOfState += ind.count;
    }
    stateDetailsObj.industry = industryArr;
    stateDetailsObj.TotalIndustry = totalIndustriesOfState;

    // Storing Sectors
    let sectorArr = [];
    let totalSectorsOfState = 0;
    for (const sec of sectorBasedNumbers) {
      sectorArr.push({
        id: sec._id.sector._id,
        text: sec._id.sector.name,
        count: sec.count,
      });
      totalSectorsOfState += sec.count;
    }
    stateDetailsObj.sector = sectorArr;
    stateDetailsObj.TotalSector = totalSectorsOfState;

    // Storing Stages
    let stageArr = [];
    let totalStagesOfState = 0;
    for (const stg of stageBasedNumbers) {
      stageArr.push({
        id: stg._id.stage,
        text: stg._id.stage,
        count: stg.count,
      });
      totalStagesOfState += stg.count;
    }
    stateDetailsObj.stage = stageArr;
    stateDetailsObj.TotalStage = totalStagesOfState;

    stateDetails[currentState._id] = stateDetailsObj;

    // Checking max counts
    stateDetails.maxStartups = maxStartups =
      template.Startup > maxStartups ? template.Startup : maxStartups;
    stateDetails.maxMentors = maxMentors =
      template.Mentor > maxMentors ? template.Mentor : maxMentors;
    stateDetails.maxIncubators = maxIncubators =
      template.Incubator > maxIncubators
        ? template.Incubator
        : maxIncubators;
    stateDetails.maxAccelarators = maxAccelarators =
      template.maxAccelarators > maxAccelarators
        ? template.maxAccelarators
        : maxAccelarators;
    stateDetails.maxCorporates = maxCorporates =
      template.Corporate > maxCorporates
        ? template.Corporate
        : maxCorporates;
    stateDetails.maxInvestors = maxInvestors =
      template.Investor > maxInvestors ? template.Investor : maxInvestors;
    stateDetails.maxGovernmentBodys = maxGovernmentBodys =
      template.GovernmentBody > maxGovernmentBodys
        ? template.GovernmentBody
        : maxGovernmentBodys;

    fs.writeFileSync(
      "./static/stateWiseCount.json",
      JSON.stringify(stateDetails, null, 4),
      function (err) {
        if (err) {
          return console.error(err);
        }
        console.log("Data written successfully for " + currentState.name);
      }
    );
  }
}

function tranformWomenOwned_Mongo(data) {
  var o = { [data._id.StateId]: data.count };
  return o;
}

function fillUndefined(value) {
  return _.isUndefined(value) ? 0 : value;
}

function processStatewiseResults(data) {
  var o = {};
  for (let i = 0; i < data.length; i++) {
    let obj = data[i];
    o[obj._id.StateId] = obj.count;
  }
  return o;
}

async function populateMultiFieldCountsForStateWithoutDate(stateId) {
  let query = [
    {
      "$facet": {
        "Startup": [
          { "$match": { "role": { "$eq": 'Startup' }, "stateId": { "$eq": stateId } } },
          { "$count": "Startup" }
        ],
        "Investor": [
          { "$match": { "role": { "$eq": 'Investor' }, "stateId": { "$eq": stateId } } },
          { "$count": "Investor" }
        ],
        "Accelerator": [
          { "$match": { "role": { "$eq": 'Accelerator' }, "stateId": { "$eq": stateId } } },
          { "$count": "Accelerator" }
        ],
        "Individual": [
          { "$match": { "role": { "$eq": 'Individual' }, "stateId": { "$eq": stateId } } },
          { "$count": "Individual" }
        ],
        "Mentor": [
          { "$match": { "role": { "$eq": 'Mentor' }, "stateId": { "$eq": stateId } } },
          { "$count": "Mentor" }
        ],
        "GovernmentBody": [
          { "$match": { "role": { "$eq": 'GovernmentBody' }, "stateId": { "$eq": stateId } } },
          { "$count": "GovernmentBody" }
        ],
        "Incubator": [
          { "$match": { "role": { "$eq": 'Incubator' }, "stateId": { "$eq": stateId } } },
          { "$count": "Incubator" }
        ],
        "Industry": [
          { "$match": { "stateId": { "$eq": stateId }, } },
          { "$unwind": "$industry" },
          { "$group": { "_id": { "industry": "$industry", "stateId": "$stateId", "state": "$stateName", }, "count": { "$sum": 1 }, }, },
        ],
        "Sector": [
          { "$match": { "stateId": { "$eq": stateId }, } },
          { "$unwind": "$sector" },
          { "$group": { "_id": { "sector": "$sector", "stateId": "$stateId", "state": "$stateName", }, "count": { "$sum": 1 }, }, },
        ],
        "Stage": [
          { "$match": { "stateId": { "$eq": stateId }, "stage": { "$nin": ["", null] } } },
          { "$group": { "_id": { "stage": "$stage", "stateId": "$stateId", "state": "$stateName", }, "count": { "$sum": 1 }, }, },
        ],
        "WomenOwned": [
          { "$match": { "womenOwned": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "WomenOwned" }
        ],
        "SeedFunded": [
          { "$match": { "seedFunded": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "SeedFunded" }
        ],
        "TaxExempted": [
          { "$match": { "taxExempted": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "TaxExempted" }
        ],
        "DpiitCertified": [
          { "$match": { "dpiitCertified": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "DpiitCertified" }
        ],
        "ShowcasedStartups": [
          { "$match": { "showcased": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "ShowcasedStartups" }
        ],
        "PatentStartup": [
          { "$match": { "patented": { "$eq": true }, "stateId": { "$eq": stateId }, } },
          { "$count": "PatentStartup" }
        ]
      }
    },
    {
      "$project": {
        "Startup": { "$arrayElemAt": ["$Startup.Startup", 0] },
        "Investor": { "$arrayElemAt": ["$Investor.Investor", 0] },
        "Accelerator": { "$arrayElemAt": ["$Accelerator.Accelerator", 0] },
        "Individual": { "$arrayElemAt": ["$Individual.Individual", 0] },
        "Mentor": { "$arrayElemAt": ["$Mentor.Mentor", 0] },
        "GovernmentBody": { "$arrayElemAt": ["$GovernmentBody.GovernmentBody", 0] },
        "Incubator": { "$arrayElemAt": ["$Incubator.Incubator", 0] },
        "Industry": ["$Industry"],
        "Sector": ["$Sector"],
        "Stage": ["$Stage"],
        "WomenOwned": { "$arrayElemAt": ["$WomenOwned.WomenOwned", 0] },
        "SeedFunded": { "$arrayElemAt": ["$SeedFunded.SeedFunded", 0] },
        "TaxExempted": { "$arrayElemAt": ["$TaxExempted.TaxExempted", 0] },
        "DpiitCertified": { "$arrayElemAt": ["$DpiitCertified.DpiitCertified", 0] },
        "ShowcasedStartups": { "$arrayElemAt": ["$ShowcasedStartups.ShowcasedStartups", 0] },
        "PatentStartup": { "$arrayElemAt": ["$PatentStartup.PatentStartup", 0] },
      }
    }
  ];

  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query).toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error('populateMultiFieldCountsForStateWithoutDate :: ' + err.message);
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

async function populateMultiFieldCountsForIndiaWithoutDate() {
  let query = [
    {
      "$facet": {
        "Startup": [
          { "$match": { "role": { "$eq": 'Startup' }, } },
          { "$count": "Startup" }
        ],
        "Investor": [
          { "$match": { "role": { "$eq": 'Investor' }, } },
          { "$count": "Investor" }
        ],
        "Accelerator": [
          { "$match": { "role": { "$eq": 'Accelerator' }, } },
          { "$count": "Accelerator" }
        ],
        "Individual": [
          { "$match": { "role": { "$eq": 'Individual' }, } },
          { "$count": "Individual" }
        ],
        "Mentor": [
          { "$match": { "role": { "$eq": 'Mentor' }, } },
          { "$count": "Mentor" }
        ],
        "GovernmentBody": [
          { "$match": { "role": { "$eq": 'GovernmentBody' }, } },
          { "$count": "GovernmentBody" }
        ],
        "Incubator": [
          { "$match": { "role": { "$eq": 'Incubator' }, } },
          { "$count": "Incubator" }
        ],
        "Industry": [
          { "$unwind": "$industry" },
          { "$group": { "_id": { "industry": "$industry" }, "count": { "$sum": 1 }, }, },
        ],
        "Sector": [
          { "$unwind": "$sector" },
          { "$group": { "_id": { "sector": "$sector" }, "count": { "$sum": 1 }, }, },
        ],
        "Stage": [
          { "$match": { "stage": { "$nin": ["", null] } } },
          { "$group": { "_id": { "stage": "$stage" }, "count": { "$sum": 1 }, }, },
        ],
        "WomenOwned": [
          { "$match": { "womenOwned": { "$eq": true }, } },
          { "$count": "WomenOwned" }
        ],
        "SeedFunded": [
          { "$match": { "seedFunded": { "$eq": true }, } },
          { "$count": "SeedFunded" }
        ],
        "TaxExempted": [
          { "$match": { "taxExempted": { "$eq": true }, } },
          { "$count": "TaxExempted" }
        ],
        "DpiitCertified": [
          { "$match": { "dpiitCertified": { "$eq": true }, } },
          { "$count": "DpiitCertified" }
        ],
        "ShowcasedStartups": [
          { "$match": { "showcased": { "$eq": true }, } },
          { "$count": "ShowcasedStartups" }
        ],
        "PatentStartup": [
          { "$match": { "patented": { "$eq": true }, } },
          { "$count": "PatentStartup" }
        ]
      }
    },
    {
      "$project": {
        "Startup": { "$arrayElemAt": ["$Startup.Startup", 0] },
        "Investor": { "$arrayElemAt": ["$Investor.Investor", 0] },
        "Accelerator": { "$arrayElemAt": ["$Accelerator.Accelerator", 0] },
        "Individual": { "$arrayElemAt": ["$Individual.Individual", 0] },
        "Mentor": { "$arrayElemAt": ["$Mentor.Mentor", 0] },
        "GovernmentBody": { "$arrayElemAt": ["$GovernmentBody.GovernmentBody", 0] },
        "Incubator": { "$arrayElemAt": ["$Incubator.Incubator", 0] },
        "Industry": ["$Industry"],
        "Sector": ["$Sector"],
        "Stage": ["$Stage"],
        "WomenOwned": { "$arrayElemAt": ["$WomenOwned.WomenOwned", 0] },
        "SeedFunded": { "$arrayElemAt": ["$SeedFunded.SeedFunded", 0] },
        "TaxExempted": { "$arrayElemAt": ["$TaxExempted.TaxExempted", 0] },
        "DpiitCertified": { "$arrayElemAt": ["$DpiitCertified.DpiitCertified", 0] },
        "ShowcasedStartups": { "$arrayElemAt": ["$ShowcasedStartups.ShowcasedStartups", 0] },
        "PatentStartup": { "$arrayElemAt": ["$PatentStartup.PatentStartup", 0] },
        
      }
    }
  ];

  var promAll = new Promise((resolve, rej) => {
    try {
      mongodb
        .getDb()
        .collection("digitalMapUser")
        .aggregate(query).toArray(async (err, result) => {
          if (err) throw err;
          let output = await result[0];
          resolve(output);
        });
    } catch (err) {
      console.error('populateMultiFieldCountsForStateWithoutDate :: ' + err.message);
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
