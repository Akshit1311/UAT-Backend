const express = require("express");
const router = express.Router();
const request = require("request");
const mongodb = require("../mongodb");
const moment = require("moment");
const _ = require("lodash");
const ObjectId = require("mongodb").ObjectId;
const fs = require("fs");
const { map } = require("lodash");
var data = fs.readFileSync("./static/count.json", "utf8");
data = JSON.parse(data);
var stateMap = fs.readFileSync("./static/stateMap.json", "utf8");
stateMap = JSON.parse(stateMap);
var allStages = fs.readFileSync("./static/allStages.json", "utf8");
allStages = JSON.parse(allStages);
var defaultsv2 = fs.readFileSync("./static/defaultsv2.json", "utf8");
defaultsv2 = JSON.parse(defaultsv2);

var blankFilterQuery = fs.readFileSync(
  "./static/blankFilterQuery.json",
  "utf8"
);
blankFilterQuery = JSON.parse(blankFilterQuery);
const startupTypeKeywordMap = {
  1: "dpiitCertified",
  2: "showcased",
  3: "seedFunded",
  4: "patented",
  5: "womenOwned",
  6: "leadingSector",
};

// Get by date range
router.get("/count/:from/:to", (req, res) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/count/{from}/{to}'
  // #swagger.description = 'Endpoint for date range wise count - India level'

  console.log("From - " + req.params.from + " To - " + req.params.to);
  try {
    mongodb
      .getDb()
      .collection("incubator")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count * " + JSON.stringify(result.length));
        data.Incubator = result.length;
      });

    mongodb
      .getDb()
      .collection("individuals")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count ** " + JSON.stringify(result.length));
        data.Individual = result.length;
      });

    mongodb
      .getDb()
      .collection("investors")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count *** " + JSON.stringify(result.length));
        data.Investor = result.length;
      });

    mongodb
      .getDb()
      .collection("startups")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count **** " + JSON.stringify(result.length));
        data.Startup = result.length;
      });

    mongodb
      .getDb()
      .collection("mentor")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count ***** " + JSON.stringify(result.length));
        data.Mentor = result.length;
      });

    mongodb
      .getDb()
      .collection("governmentbody")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count ****** " + JSON.stringify(result.length));
        data.GovernmentBody = result.length;
      });

    mongodb
      .getDb()
      .collection("corporates")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Count ******* " + JSON.stringify(result.length));
        data.Corporate = result.length;
      });

    console.log("Fetching accelerators..");
    mongodb
      .getDb()
      .collection("accelerators")
      .find({
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      })
      .toArray((err, result) => {
        if (err) throw err;

        //console.log('Fetched startups ' + JSON.stringify(result))
        console.log("Count ******** " + JSON.stringify(result.length));
        data.Accelerator = result.length;
        res.send(data);
      });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// defining an endpoint to return all ads
router.get("/count/all", (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/count/all'
  // #swagger.description = 'Get India level startup count from inception'

  request(process.env.COUNT_ALL_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);
    res.body.data.maxRange = 2000;
    //return res
    resp.send(res.body.data);
  });
});

router.post("/filter", (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/filter'
  // #swagger.description = 'Get filtered multi-level startup details'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$states": [],
          "$stages": [],
          "$badges": [],
          "$roles": ["Startup", "Mentor", "Investor", "GovernmentBody", "Incubator", "Accelerator"]
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));
  var query = JSON.parse(JSON.stringify(blankFilterQuery));
  query.industries = req.body.industries;
  query.sectors = req.body.sectors;
  query.states = req.body.states;
  query.stages = req.body.stages;
  query.badges = req.body.badges;
  query.roles = req.body.roles;
  query.page = req.body.page;
  const otherRoles = [
    "Mentor",
    "Incubator",
    "Investor",
    "Accelerator",
    "Institution",
  ];
  // console.log(JSON.stringify(query.roles));
  if (otherRoles.includes(query.roles[0])) {
    query.dpiitRecogniseUser = false;
  }

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

    // add available logos
    if (allItems) {
      const l = allItems.length;
      const lu = process.env.PROFILE_LOGO_URL;
      for (let i = 0; i < l; i++) {
        let itm = allItems[i];
        if (itm.pic) {
          itm.logo = lu + itm.role + "?fileName=" + itm.pic;
          allItems[i] = itm;
        }
      }
    }

    resp.send(allItems);
  });
});

router.post("/filter/defaults", (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/filter/defaults'
  // #swagger.description = 'Get all filterable items'

  console.log("Filter request - " + JSON.stringify(req.body));

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
    var output = {};
    //console.log(body);
    let allFilterableItems = JSON.parse(body).allFacets;
    // var allIndustriesArr = allFilterableItems[0].content;
    var allSectorsArr = allFilterableItems[1].content;
    // var allStatesArr = allFilterableItems[3].content;
    // var allStagesArr = allFilterableItems[6].content;
    // var allBadgesArr = allFilterableItems[7].content;

    // var allDpiitCertifiedsArr = allFilterableItems[8].content;
    //All states
    output.states = allFilterableItems[3].content.map(transformData);
    //All Unique Sectors
    output.sectors = getUniqueListBy(
      allFilterableItems[1].content.map(transformData),
      "value"
    );

    //All Industries
    output.industries = allFilterableItems[0].content.map(transformData);
    //All Stages
    output.stages = allFilterableItems[6].content.map(transformData);
    //All Badges
    output.badges = allFilterableItems[7].content.map(transformData);
    //All DPIIT certified
    output.dpiitStatus = allFilterableItems[8].content.map(transformData);
    resp.send(output);
  });
});

router.post("/v2_workingBackup/filter", (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/v2_workingBackup/filter'
  // #swagger.description = 'Get filtered multi-level startup details'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$states": [],
          "$stages": [],
          "$badges": [],
          "$roles": ["Startup", "Mentor", "Investor", "GovernmentBody", "Incubator", "Accelerator"],
          "$registrationFrom": "",
          "$registrationTo": ""
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));
  var query = JSON.parse(JSON.stringify(blankFilterQuery));
  query.industries = req.body.industries;
  query.sectors = req.body.sectors;
  query.states = req.body.states;
  query.stages = req.body.stages;
  query.badges = req.body.badges;
  query.roles = req.body.roles;
  query.registrationFrom = req.body.registrationFrom;
  query.registrationTo = req.body.registrationTo;

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
    var output = {};
    var allItems = JSON.parse(body).content;

    // add available logos
    if (allItems) {
      const l = allItems.length;
      const lu = process.env.PROFILE_LOGO_URL;
      for (let i = 0; i < l; i++) {
        let itm = allItems[i];
        if (itm.pic) {
          itm.logo = lu + itm.role + "?fileName=" + itm.pic;
          allItems[i] = itm;
        }
      }
    }
    output.fromDate = req.body.fromDate;
    output.toDate = req.body.toDate;
    output.entity = allItems;

    var allFilterableItems = JSON.parse(body).allFacets;
    var allIndustriesArr = allFilterableItems[0].content;
    var allSectorsArr = allFilterableItems[1].content;
    var allStatesArr = allFilterableItems[3].content;
    let allRoleArr = allFilterableItems[5].content;
    var allStagesArr = allFilterableItems[6].content;
    var allBadgesArr = allFilterableItems[7].content;

    var allDpiitCertifiedsArr = allFilterableItems[8].content;

    output.states = allStatesArr.map(transformData);
    output.sectors = allSectorsArr.map(transformData);
    output.industries = allIndustriesArr.map(transformData);
    output.roles = allRoleArr.map(transformData);
    output.counts = allRoleArr.map(transformCount);
    output.stages = allStagesArr.map(transformData);
    output.badges = allBadgesArr.map(transformData);
    output.dpiitStatus = allDpiitCertifiedsArr.map(transformData);

    //resp.send(allItems);
    resp.send(output);
  });
});

router.post("/filter/v2_workingBackup/defaults", (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/filter/v2_workingBackup/defaults'
  // #swagger.description = 'Get all filterable items'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$registrationFrom": "",
          "$registrationTo": ""
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));
  var query = JSON.parse(JSON.stringify(blankFilterQuery));
  query.registrationFrom = req.body.registrationFrom;
  query.registrationTo = req.body.registrationTo;

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
    var output = {};
    //console.log(body);
    var allFilterableItems = JSON.parse(body).allFacets;
    var allIndustriesArr = allFilterableItems[0].content;
    var allSectorsArr = allFilterableItems[1].content;
    var allStatesArr = allFilterableItems[3].content;
    let allRoleArr = allFilterableItems[5].content;
    var allStagesArr = allFilterableItems[6].content;
    var allBadgesArr = allFilterableItems[7].content;

    var allDpiitCertifiedsArr = allFilterableItems[8].content;

    output.states = allStatesArr.map(transformData);
    output.sectors = allSectorsArr.map(transformData);
    output.industries = allIndustriesArr.map(transformData);
    output.roles = allRoleArr.map(transformData);
    output.counts = allRoleArr.map(transformCount);
    output.stages = allStagesArr.map(transformData);
    output.badges = allBadgesArr.map(transformData);
    output.dpiitStatus = allDpiitCertifiedsArr.map(transformData);
    resp.send(output);
  });
});

router.post("/filter/v2/defaults", async (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/filter/v2/defaults'
  // #swagger.description = 'Get all filterable items'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$registrationFrom": "",
          "$registrationTo": ""
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));

  if (
    (!req.body.hasOwnProperty("registrationFrom") &&
      !req.body.hasOwnProperty("registrationTo")) ||
    (_.isEmpty(req.body.registrationFrom) &&
      _.isEmpty(req.body.registrationTo)) ||
    (moment(req.body.registrationTo, "YYYY-MM-DD", true).isValid() &&
      moment(req.body.registrationFrom, "YYYY-MM-DD", true).isValid())
  ) {
    console.log("Optional Date validation passed.");
  } else {
    resp
      .status(500)
      .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
  }

  let queryObjD = [];
  if (
    !_.isEmpty(req.body.registrationFrom) &&
    !_.isEmpty(req.body.registrationTo)
  ) {
    queryObjD.push({
      $match: {
        profileRegisteredOn: {
          $lte: new Date(req.body.registrationTo),
          $gte: new Date(req.body.registrationFrom),
        },
      },
    });
  }
  queryObjD.push({
    $group: {
      _id: {
        Role: "$role",
      },
      count: { $sum: 1 },
    },
  });

  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate(queryObjD)
      .toArray((err, result) => {
        if (err) throw err;
        //console.log("* Output rows - " + JSON.stringify(result.length));
        console.log("* Output - " + JSON.stringify(result));
        let output = JSON.parse(JSON.stringify(result));
        output.counts = result.map(transformCount_Mongo);
        resp.status(200).send(output);
      });
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.post("/v3/filter", async (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/v3/filter'
  // #swagger.description = 'Get filtered multi-level startup details'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$stages": [],
          "$badges": [],
          "$roles": ["Startup", "Mentor", "Investor", "GovernmentBody", "Incubator", "Accelerator"],
          "$registrationFrom": "",
          "$registrationTo": ""
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));
  var query = JSON.parse(JSON.stringify(blankFilterQuery));
  query.industries = req.body.industries;
  query.sectors = req.body.sectors;
  query.states = req.body.states;
  query.stages = req.body.stages;
  query.badges = req.body.badges;
  query.roles = req.body.roles;
  query.registrationFrom = req.body.registrationFrom;
  query.registrationTo = req.body.registrationTo;

  // DB CALL
  try {
    await mongodb
      .getDb()
      .collection("Placeholder")
      .find({})
      .toArray((err, result) => {
        if (err) throw err;
        console.log("* Output rows - " + JSON.stringify(result.length));
        //console.log("* Output - " + JSON.stringify(result));
        //data.Incubator = result.length;
        resp.send(result);
      });
    /*
    mongodb
      .getDb()
      .collection("users")
      .aggregate([
        {
          $match: {
            createdOn: {
              $lt: new Date(req.params.from),
              $gt: new Date(req.params.to),
            },
          },
        },
        {
          $group: {
            _id: {
              role: "$publish.role",
              stateid: "$publish.location.state.$id",
            },
            count: { $count: {} },
          },
        },
        {
          $group: {
            _id: "$_id.stateid",
            roles: {
              $push: { role: "$_id.role", count: "$count" },
            },
          },
        },
      ])
      .toArray((err, result) => {
        if (err) throw err;
        console.log("Output rows - " + JSON.stringify(result.length));
        console.log("Output - " + JSON.stringify(result));
        //data.Incubator = result.length;
      });*/
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }

  // OUTPUT
  /*
  var output = {};

  output.fromDate = req.body.fromDate;
  output.toDate = req.body.toDate;
  output.entity = allItems;

  output.states = allStatesArr.map(transformData);
  output.sectors = allSectorsArr.map(transformData);
  output.industries = allIndustriesArr.map(transformData);
  output.roles = allRoleArr.map(transformData);
  output.counts = allRoleArr.map(transformCount);
  output.stages = allStagesArr.map(transformData);
  output.badges = allBadgesArr.map(transformData);
  output.dpiitStatus = allDpiitCertifiedsArr.map(transformData);

  //resp.send(allItems);
  resp.send(output);
  */
});

router.post("/v2/filter", async (req, resp) => {
  // #swagger.tags = ['Filter']
  // #swagger.path = '/startup/v2/filter'
  // #swagger.description = 'Get filtered multi-level startup details'
  /*  #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Schema for query to filter based on criteria',
        schema: {
          "$industries": [],
          "$sectors": [],
          "$stages": ["Scaling", "EarlyTraction", "Validation"],
          "$states": [],
          "$badges": ["true"],
          "$roles": ["Startup", "Mentor", "Investor", "GovernmentBody", "Incubator", "Accelerator"],
          "$registrationFrom": "",
          "$registrationTo": ""
        }
    } */
  console.log("Filter request - " + JSON.stringify(req.body));
  // resp.send(JSON.stringify(req.body));
  if (
    (!req.body.hasOwnProperty("registrationFrom") &&
      !req.body.hasOwnProperty("registrationTo")) ||
    (_.isEmpty(req.body.registrationFrom) &&
      _.isEmpty(req.body.registrationTo)) ||
    (moment(req.body.registrationTo, "YYYY-MM-DD", true).isValid() &&
      moment(req.body.registrationFrom, "YYYY-MM-DD", true).isValid())
  ) {
    console.log("Optional Valid dates passed.");
  } else {
    resp
      .status(500)
      .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
  }

  let subQuery = {};
  if (
    !_.isEmpty(req.body.registrationFrom) &&
    !_.isEmpty(req.body.registrationTo)
  ) {
    subQuery.profileRegisteredOn = {
      $lte: req.body.registrationTo,
      $gte: req.body.registrationFrom,
    };
  }

  if (req.body.hasOwnProperty("states") && req.body.states.length) {
    subQuery.stateId = {
      $in: req.body.states,
    };
  }

  if (req.body.hasOwnProperty("stages") && req.body.stages.length) {
    subQuery.stage = {
      $in: req.body.stages,
    };
  }

  if (req.body.hasOwnProperty("roles") && req.body.roles.length) {
    subQuery.role = {
      $in: req.body.roles,
    };
  }

  if (req.body.hasOwnProperty("industries") && req.body.industries.length) {
    let inds = [];
    for (let ind of req.body.industries) {
      inds.push(new ObjectId(ind));
    }
    subQuery["industry._id"] = {
      $in: inds,
    };
  }

  if (req.body.hasOwnProperty("sectors") && req.body.sectors.length) {
    let secs = [];
    for (let sec of req.body.sectors) {
      secs.push(new ObjectId(sec));
    }
    subQuery["sector._id"] = {
      $in: secs,
    };
  }

  if (
    req.body.hasOwnProperty("badges") &&
    req.body.badges.length &&
    req.body.badges[0] == "true"
  ) {
    subQuery.badges = {
      badges: { $exists: true, $type: "array", $ne: [] },
    };
  }

  // DB CALL
  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          $match: subQuery,
        },
        {
          $group: {
            _id: {
              Role: "$role",
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray((err, result) => {
        if (err) throw err;
        //console.log("* Output - " + JSON.stringify(result));
        let output = JSON.parse(JSON.stringify(result));
        output.counts = result.map(transformCount_Mongo);
        resp.status(200).send(output);
      });
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get("/stages/:state", (req, resp) => {
  // #swagger.tags = ['Business']
  // #swagger.path = '/startup/stages/{state}'
  // #swagger.description = 'Get state-wise stages'

  request(
    process.env.STAGES_URL + req.params.state,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(body);
      console.log(res);
      resp.send(res.body.data);
    }
  );
});

router.get("/sectors/:state", (req, resp) => {
  // #swagger.tags = ['Business']
  // #swagger.path = '/startup/sectors/{state}'
  // #swagger.description = 'Get state-wise sectors'

  request(
    process.env.SECTORS_URL + req.params.state,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(body);
      console.log(res);
      resp.send(res.body.data);
    }
  );
});

router.get("/recognisedcount/all", (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/recognisedcount/all'
  // #swagger.description = 'Count of recognised startups'

  request(
    process.env.RECOGNISED_COUNT_URL,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(body);
      console.log(res);
      resp.send(res.body.data);
    }
  );
});

router.get("/startupCount/:type", async (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/startupCount/{type}'
  // #swagger.description = 'Count for a given startup type'

  let searchObj = {};
  let type = req.params.type;
  switch (type) {
    case "0":
      searchObj.role = `${startupTypeKeywordMap[type]}`;
      break;
    case "1":
    case "2":
    case "5":
    case "6":
    case "7":
    case "8":
      searchObj[startupTypeKeywordMap[type]] = true;
      break;
  }

  try {
    let count = await mongodb
      .getDb()
      .collection("digitalMapUser")
      //.count(`${searchQuery}`))
      .count(searchObj);
    resp.status(200).send(count + "");
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get(
  "/startupCount/:geoType/:geoIdType/:geoIdValue/:entityType/:from/:to",
  async (req, resp) => {
    // #swagger.tags = ['Counts']
    // #swagger.path = '/startup/startupCount/{geoType}/{geoIdType}/{geoIdValue}/{entityType}/{from}/{to}'
    // #swagger.description = 'Count for a given startup type at given geography details with date range'

    if (req.params.geoType != "district" && req.params.geoType != "state") {
      resp.status(500).json({ message: "Invalid Geography Type" });
    }
    if (req.params.geoIdType != "id" && req.params.geoIdType != "name") {
      resp.status(500).json({ message: "Invalid Geography Identifier" });
    }

    let searchObj = {};

    if (
      moment(req.params.from, "YYYY-MM-DD", true).isValid() &&
      moment(req.params.to, "YYYY-MM-DD", true).isValid()
    ) {
      searchObj.profileRegisteredOn = {
        $lte: req.params.to,
        $gte: req.params.from,
      };
    } else {
      resp
        .status(500)
        .json({ message: "Invalid Date Format, expected in YYYY-MM-DD" });
    }

    if (req.params.geoType == "state") {
      if (req.params.geoIdType == "id") {
        searchObj.stateId = req.params.geoIdValue;
      } else {
        searchObj.stateName = req.params.geoIdValue;
      }
    } else {
      // district
      if (req.params.geoIdType == "id") {
        searchObj.districtId = req.params.geoIdValue;
      } else {
        searchObj.districtName = req.params.geoIdValue;
      }
    }
    let type = req.params.entityType;
    switch (type) {
      case "0":
        searchObj.role = `${startupTypeKeywordMap[type]}`;
        break;
      case "1":
      case "2":
      case "4":
      case "5":
      case "6":
      case "7":
        searchObj[startupTypeKeywordMap[type]] = true;
        break;
    }

    try {
      let count = await mongodb
        .getDb()
        .collection("digitalMapUser")
        //.count(`${searchQuery}`))
        .count(searchObj);
      resp.status(200).send(count + "");
    } catch (err) {
      resp.status(500).json({ message: err.message });
    }
  }
);

router.get("/dpiit/states", (req, resp) => {
  // #swagger.tags = ['Geography']
  // #swagger.path = '/startup/dpiit/states'
  // #swagger.description = 'List of all dpiit states'

  request(process.env.DPIIT_STATES_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);
    resp.send(res.body.data);
  });
});

router.get("/dpiit/count/all", async (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/dpiit/count/all'
  // #swagger.description = 'Count of India level dpiit startups'

  try {
    const countAll = await mongodb.getDb().collection("startups").count({
      "publish.startup.dippCertified": true,
    });
    console.log("DPIIT Count all startups - " + countAll);
    resp.json(countAll);
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get("/dpiit/count/:from/:to", async (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/dpiit/count/{from}/{to}'
  // #swagger.description = 'Count of India level dpiit startups with date range'

  console.log("From - " + req.params.from + " To - " + req.params.to);
  try {
    const countAll = await mongodb
      .getDb()
      .collection("startups")
      .count({
        "publish.startup.dippCertified": true,
        createdOn: {
          $lt: new Date(req.params.from),
          $gt: new Date(req.params.to),
        },
      });
    console.log("DPIIT Count all startups with date range - " + countAll);
    resp.json(countAll);
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get("/states", (req, resp) => {
  // #swagger.tags = ['Geography']
  // #swagger.path = '/startup/states'
  // #swagger.description = 'List of all state with state id'

  request(process.env.STATES_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);
    var apiData = res.body.data;
    for (var state in apiData) {
      var stateid = apiData[state].id;
      apiData[state].d = stateMap[stateid];
    }
    resp.send(apiData);
  });
});

router.get("/districts/:stateId", (req, resp) => {
  // #swagger.tags = ['Geography']
  // #swagger.path = '/startup/districts/{stateId}'
  // #swagger.description = 'List of all districts by state id'

  request(
    process.env.DISTRICT_URL + req.params.stateId,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(body);
      console.log(res);
      resp.send(res.body.data);
    }
  );
});

router.get("/v2/districts/:stateId", async (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/v2/districts/{stateId}'
  // #swagger.description = 'List of all districts by state id with counts'

  if (_.isEmpty(req.params.stateId)) {
    resp.status(500).json({ message: "Invalid state id" });
  }

  let subQueryDist = {
    stateId: { $eq: req.params.stateId },
  };

  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          $match: subQueryDist,
        },
        {
          $group: {
            _id: {
              role: "$role",
              districtid: "$districtId",
              district: "$districtName",
              stateId: "$stateId",
              state: "$stateName",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.districtid",
            roles: {
              $push: {
                role: "$_id.role",
                district: "$_id.district",
                stateId: "$_id.stateId",
                state: "$_id.state",
                count: "$count",
              },
            },
          },
        },
      ])
      .toArray((err, result) => {
        if (err) throw err;
        let countsArr = [];
        for (let i = 0; i < result.length; i++) {
          let dd = result[i];
          let district = {};
          let count = {};
          district.id = dd._id;
          district.name = dd.roles[0].district;
          district.stateId = dd.roles[0].stateId;
          district.state = dd.roles[0].state;

          for (let j = 0; j < dd.roles.length; j++) {
            let role = dd.roles[j];
            count[role.role] = role.count;
          }
          district.counts = count;
          countsArr.push(district);
        }
        resp.status(200).send(countsArr);
      });
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get("/v2/districts", async (req, resp) => {
  // #swagger.tags = ['Counts']
  // #swagger.path = '/startup/v2/districts'
  // #swagger.description = 'List of all districts with counts'

  try {
    await mongodb
      .getDb()
      .collection("digitalMapUser")
      .aggregate([
        {
          $group: {
            _id: {
              role: "$role",
              districtid: "$districtId",
              district: "$districtName",
              stateId: "$stateId",
              state: "$stateName",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.districtid",
            roles: {
              $push: {
                role: "$_id.role",
                district: "$_id.district",
                stateId: "$_id.stateId",
                state: "$_id.state",
                count: "$count",
              },
            },
          },
        },
      ])
      .toArray((err, result) => {
        if (err) throw err;
        let countsArr = [];
        for (let i = 0; i < result.length; i++) {
          let dd = result[i];
          let district = {};
          let count = {};
          district.id = dd._id;
          district.name = dd.roles[0].district;
          district.stateId = dd.roles[0].stateId;
          district.state = dd.roles[0].state;

          for (let j = 0; j < dd.roles.length; j++) {
            let role = dd.roles[j];
            count[role.role] = role.count;
          }
          district.counts = count;
          countsArr.push(district);
        }
        resp.status(200).send(countsArr);
      });
  } catch (err) {
    resp.status(500).json({ message: err.message });
  }
});

router.get("/industry/all", (req, resp) => {
  // #swagger.tags = ['Industry']
  // #swagger.path = '/startup/industry/all'
  // #swagger.description = 'List of all industries category in India'

  request(process.env.INDUSTRY_ALL_URL, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    console.log(res);
    resp.send(res.body.data);
  });
});

router.get("/subIndustry/:industryId", (req, resp) => {
  // #swagger.tags = ['Industry']
  // #swagger.path = '/startup/subIndustry/{industryId}'
  // #swagger.description = 'List of sub-industries by industry id'

  request(
    process.env.SUB_INDUSTRY_URL + req.params.industryId,
    { json: true },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(body);
      console.log(res);
      resp.send(res.body.data);
    }
  );
});

router.get("/badges", (req, resp) => {
  // #swagger.tags = ['Recognition']
  // #swagger.path = '/startup/badges'
  // #swagger.description = 'List of badges'

  var options = {
    method: "POST",
    url: "https://api.startupindia.gov.in/sih/api/noauth/search/badge/get",
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
    body: JSON.stringify({}),
  };

  request(options, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    console.log(body);
    resp.send(JSON.parse(res.body));
  });
});

function transformData(data) {
  var o = {};
  o.id = data.value;
  o.value = data.key.value;
  return o;
}

function transformCount(data) {
  var o = {};
  o.id = data.value;
  o.value = data.valueCount;
  return o;
}

function transformCount_Mongo(data) {
  var o = {};
  o.id = data._id.Role;
  o.value = data.count;
  return o;
}

//Returns an array of unique items keeping last occurrence of each
function getUniqueListBy(arr, key) {
  return [...new Map(arr.map((item) => [item[key], item])).values()];
}

async function getMyData(geoName) {
  console.log("Getting details for " + geoName);
  var output = {};

  var proA = new Promise((resolve, rej) => {
    request(
      "https://api.startupindia.gov.in/sih/api/noauth/statesPolicy/startup/sectorWise/" +
        stateName,
      { json: true },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        console.log("Sectorwise - " + JSON.stringify(body));
        output.sectors = res.body.data;
        resolve(res.body.data);
      }
    );
  });
  var proB = new Promise((resolve, rej) => {
    request(
      "https://api.startupindia.gov.in/sih/api/noauth/statesPolicy/startup/stageWise/awards/" +
        stateName,
      { json: true },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        console.log("StagewiseAwards - " + JSON.stringify(body));
        output.stagewiseAwards = res.body.data;
        resolve(res.body.data);
      }
    );
  });
  var proC = new Promise((resolve, rej) => {
    request(
      "https://api.startupindia.gov.in/sih/api/noauth/statesPolicy/startup/stageWise/funding/" +
        stateName,
      { json: true },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        console.log("StagewiseFundings - " + JSON.stringify(body));
        output.stagewiseFundings = res.body.data;
        resolve(res.body.data);
      }
    );
  });
  var proD = new Promise((resolve, rej) => {
    request(
      "https://api.startupindia.gov.in/sih/api/noauth/statesPolicy/startup/stageWise/" +
        stateName,
      { json: true },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        console.log("Stages - " + JSON.stringify(body));
        output.stages = res.body.data;
        resolve(res.body.data);
      }
    );
  });

  return Promise.all([proA, proB, proC, proD])
    .then((values) => {
      console.log("All promises resolved");
      return output;
    })
    .catch((reason) => {
      console.log(reason);
    });
}

module.exports = router;
