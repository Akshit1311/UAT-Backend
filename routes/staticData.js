const express = require("express");
const router = express.Router();
const moment = require("moment");

const fs = require("fs");
var districtsMap = fs.readFileSync("./static/districts.json", "utf8");
districtsMap = JSON.parse(districtsMap);
var startupTypes = fs.readFileSync("./static/startupTypes.json", "utf8");
startupTypes = JSON.parse(startupTypes);

router.get("/districtData", (req, resp) => {
  // #swagger.tags = ['Static Data']
  // #swagger.path = '/static/districtData'
  // #swagger.description = 'Static data of Districts'
  resp.send(districtsMap);
});

router.get("/startupTypes", (req, resp) => {
  // #swagger.tags = ['Static Data']
  // #swagger.path = '/static/startupTypes'
  // #swagger.description = 'Static data of Startup Types'
  resp.send(startupTypes);
});

router.get("/searchDateRanges", (req, resp) => {
  // #swagger.tags = ['Static Data']
  // #swagger.path = '/static/searchDateRanges'
  // #swagger.description = 'Date ranges for getting count'

  const today = moment().format("YYYY-MM-DD");
  const currentYear = moment().year();
  const currentMonth = moment().month()+1; //added 1 tomatch with month number
  const oneWeekAgo = moment().subtract(1, "weeks").format("YYYY-MM-DD");
  const oneMonthAgo = moment().subtract(1, "months").format("YYYY-MM-DD");
  const threeMonthsAgo = moment().subtract(3, "months").format("YYYY-MM-DD");
  const sixMonthsAgo = moment().subtract(6, "months").format("YYYY-MM-DD");
  const nineMonthsAgo = moment().subtract(9, "months").format("YYYY-MM-DD");
  const oneYearFromToday = moment().subtract(12, "months").format("YYYY-MM-DD");
  //if currrent month is april (2) onwards then year is current year else last year
  let financialYear = (currentMonth>2)?currentYear:currentYear-1;
  //Set current financial year to 01-04-current financial year start 
  var startCurrentFY = moment([financialYear, 3, 1]).format("YYYY-MM-DD");
    //Set current Calendar year to 01-01-current  year start 
  var startCurrentCY = moment([currentYear, 0, 1]).format("YYYY-MM-DD");

  console.log(today);
  console.log(oneWeekAgo);
  console.log(oneMonthAgo);
  console.log(threeMonthsAgo);
  console.log(sixMonthsAgo);
  console.log(nineMonthsAgo);
  console.log(`One year from today is ${oneYearFromToday}`);
  console.log(`Current FY Start Date ${startCurrentFY}`);
  console.log(`Current Calendar Year Start Date ${startCurrentCY}`);

  var dates = [];
  dates.push({ text: "Last week", to: today, from: oneWeekAgo });
  dates.push({ text: "Last month", to: today, from: oneMonthAgo });
  dates.push({ text: "Last 3 months", to: today, from: threeMonthsAgo });
  dates.push({ text: "Last 6 months", to: today, from: sixMonthsAgo });
  dates.push({ text: "Last 9 months", to: today, from: nineMonthsAgo });
  dates.push({ text: "Last One Year", to: today, from: oneYearFromToday });
  dates.push({ text: "Year To Date (Financial Year)", to: today, from: startCurrentFY });
  dates.push({ text: "Year To Date (Calendar Year)", to: today, from: startCurrentCY });
  resp.send(dates);
});

module.exports = router;
