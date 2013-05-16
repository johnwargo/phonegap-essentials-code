//===============================================
// Example 22-1
// JavaScript source: main.js
//===============================================

var theDB;

function init() {

  console.log("Entering init");
  alert("init");

  var purgeStatus, purgeInterval;

  //Set the default value for the date input field the first
  // time the form opens (afterwards just use the previous
  // value entered by the user)
  var now = new Date();
  var todayStr = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  $('#editDate').val(todayStr);

  //Create or open the database
  console.log("Opening database");
  theDB = window.openDatabase("mtDB", "1.0", "Mileage Tracker", 3 * 1024 * 1024);
  console.log("Checking theDB");
  if(theDB) {
    console.log(theDB);
    console.log("Creating table");
    theDB.transaction(createTable, onTxError, onTxSuccess);
    console.log("Finished creating table");
  } else {
    console.log("theDB object has not been created");
    alert("this code shouldn't ever execute");
  }

  //Get purgeStatus from the persistent storage area
  purgeStatus = window.localStorage.getItem("purgeStatus");
  //Get purgeInterval from the persistent storage area
  purgeInterval = window.localStorage.getItem("purgeInterval");
  //if purge is enabled, then do the purge
  if(purgeStatus == "true") {
    //Set the purgeStatus value on the config screen
    $("#purgeStatus").attr("checked", true);
    //Now set the purgeInterval value on the config screen
    $("#purgeInterval").attr('value', purgeInterval);
    //See if there's any old data to purge
    doPurge(purgeInterval);
  }
  console.log("Leaving init");
}

function createTable(tx) {
  console.log("Entering createTable");
  var sqlStr = 'CREATE TABLE IF NOT EXISTS MILEAGE (tripDate INT, miles INT, notes TEXT)';
  console.log(sqlStr);
  tx.executeSql(sqlStr, [], onSqlSuccess, onSqlError);
  console.log("Leaving createTable");
}

function onTxSuccess() {
  console.log("TX: success");
}

function onTxError(tx, err) {
  console.log("Entering onTxError");
  var msgText;
  //Did we get an error object (we should have)?
  if(err) {
    //Tell the user what happened
    msgText = "TX: " + err.message + " (" + err.code + ")";
  } else {
    msgText = "TX: Unkown error";
  }
  console.error(msgText);
  alert(msgText);
  console.log("Leaving onTxError");
}

function onSqlSuccess(tx, res) {
  console.log("SQL: success");
  if(res) {
    console.log(res);
  }
}

function onSqlError(tx, err) {
  console.log("Entering onSqlError");
  var msgText;
  if(err) {
    msgText = "SQL: " + err.message + " (" + err.code + ")";
  } else {
    msgText = "SQL: Unknown error";
  }
  console.error(msgText);
  alert(msgText);
  console.log("Leaving onSqlError");
}

function saveRecord() {
  console.log("Entering saveRecord");
  //Make sure we have a valid date before trying to save the entry

  //Make sure numMiles > 0 before trying to save the entry

  //Write the record to the database
  theDB.transaction(insertRecord, onTxError, onTxSuccess);
  console.log("Leaving saveRecord");
}

function insertRecord(tx) {
  console.log("Entering insertRecord");
  //Create a new date object to hold the date the user entered
  var tmpDate = new Date.fromString(document.getElementById("editDate").value);
  console.log("Date: " + tmpDate.valueOf());
  var tmpMiles = document.getElementById("editNumMiles").value;
  console.log("Miles: " + tmpMiles);
  var tmpNotes = document.getElementById("editNotes").value;
  console.log("Notes: " + tmpNotes);
  var sqlStr = 'INSERT INTO MILEAGE (tripDate, miles, notes) VALUES (?, ?, ?)';
  console.log(sqlStr);
  tx.executeSql(sqlStr, [tmpDate.valueOf(), tmpMiles, tmpNotes], onSqlSuccess, onSqlError);

  //Reset the form by setting a blank value for the input values
  // using the jQuery $ selector
  var blankVal = {
    value : ''
  };
  $("#editNumMiles").attr(blankVal);
  $("#editNotes").attr(blankVal);
  console.log("Leaving insertRecord");
}

function openView(viewType) {
  console.log("Entering openView");
  var headerTxt, sqlStr;

  //Get the current date
  var now = new Date();
  //Whack everything but just the date portion
  var todayStr = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  //The todayVal variable is the current date in milliseconds
  var tmpDate = Date.fromString(todayStr);
  var todayVal = tmpDate.valueOf(tmpDate);
  //Now let's process our different view types
  switch(viewType) {
    case 1:
      headerTxt = "Today's Trips";
      //Build a SQL string using the current date value
      sqlStr = "SELECT * FROM MILEAGE WHERE tripDate = " + todayVal + " ORDER BY tripDate ASC";
      break;
    case 2:
      headerTxt = "Trips Last 7 Days";
      //Last week is today - the number of milliseconds in 7 days.
      //which is (1000 * 60 * 60 * 24 * 7) or 604,800,000
      var lastWeek = todayVal - 604800000;
      sqlStr = "SELECT * FROM MILEAGE WHERE tripDate >= " + lastWeek + " ORDER BY tripDate ASC";
      break;
    case 3:
      headerTxt = "Trips By Date";
      sqlStr = "SELECT * FROM MILEAGE ORDER BY tripDate ASC";
      break;
  }
  //Set the heading on the page
  $("#viewTitle").html(headerTxt);

  console.log("SQL: " + sqlStr);
  theDB.transaction(function(tx) {
    tx.executeSql(sqlStr, [], onQuerySuccess, onQueryFailure);
  }, onTxError, onTxSuccess);
  console.log("Leaving openView");
}

function onQuerySuccess(tx, results) {
  console.log("Entering onQuerySuccess");
  if(results.rows) {
    console.log("Rows: " + results.rows);
    var htmlStr = "";
    var len = results.rows.length;
    if(len > 0) {
      for(var i = 0; i < len; i++) {
        var theDate = new Date(results.rows.item(i).tripDate);
        htmlStr += '<b>Date:</b> ' + theDate.toDateString() + '<br />';
        var numMiles = results.rows.item(i).miles;
        if(numMiles > 1) {
          htmlStr += '<b>Miles:</b> ' + numMiles + ' miles<br />';
        } else {
          htmlStr += '<b>Miles:</b> 1 mile<br />';
        }
        //Check to see if there are any notes before writing
        // anything to the page
        var theNotes = results.rows.item(i).notes;
        if(theNotes.length > 0) {
          htmlStr += '<b>Notes:</b> ' + theNotes + '<br />';
        }
        htmlStr += '<hr />';
      }

      $("#viewData").html(htmlStr);
      //Open the View page to display the data
      $.mobile.changePage("#dataView", "slide", false, true);

    } else {
      //This should never happen
      alert("No rows.");
    }
  } else {
    alert("No records match selection criteria.");
  }
  console.log("Leaving openView");
}

function onQueryFailure(tx, err) {
  console.log("Entering onQueryFailure");
  var msgText;
  if(err) {
    msgText = "Query: " + err;
  } else {
    msgText = "Query: Unknown error";
  }
  console.error(msgText);
  alert(msgText);
  console.log("Leaving onQueryFailure");
}

function doPurge(pi) {
  alert("doPurge");
  //Write some code here to purge the database after a the
  // specified purge interval

}

function showConfigPage() {
  $.mobile.changePage("#config", "flip", false, true);
}

function showViewPage() {
  $.mobile.changePage("#viewList", "slide", false, true);
}

function saveConfig() {
  //Write the config settings to localstorage
  window.localStorage.setItem("purgeStatus", document.getElementById("purgeStatus").checked);
  window.localStorage.setItem("purgeInterval", document.getElementById("purgeInterval").value);
  //Then switch back to the main page
  $.mobile.changePage("#main", "flip", false, false);
}