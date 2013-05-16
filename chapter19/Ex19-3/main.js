//===============================================
// Example 19-1
// JavaScript source: main.js
//===============================================
//Location content & watchID
var watchID;

function startWatch() {
  $('#btnStart').hide();
  $('#btnCancel').show();
  var locOptions = {
    frequency : 3000,
    timeout : 5000,
    enableHighAccuracy : true
  };
  //get the current location
  watchID = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, locOptions);
}

function onLocationSuccess(loc) {
  alert("onLocationSuccess");
  //Calculate distance

  //Calculate heading

  //Update the page

}

function onLocationError(e) {
  alert("Error: #" + e.code + "\n" + e.message);
}

function cancelWatch() {
  if(watchID != null) {
    //Clear the watch
    navigator.geolocation.clearWatch(watchID);
    //Let the user know we cleared the watch
    alert("Watch Cancelled");
    //Clear the watch ID in case someone clicks the button
    // again
    watchID = null;
  } else {
    //No watch to clear, so tell the user
    alert("No watch to cancel.");
  }
}