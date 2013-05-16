//===============================================
// Example 20-1
// JavaScript source: main.js
//===============================================

var fileDur, theMedia, theTimer;

function init() {
  alert("Init");
  var fileName = "http://mcnell.fatcow.com/files/hope.m4a ";
  console.log(fileName);
  //Create the media object we need to do everything we need here
  theMedia = new Media(fileName, onMediaSuccess, onMediaError, onMediaStatus);
  console.log("Got this far!");
  console.log(theMedia);
  //Update the UI with the track name
  $('#track').html("<b>File:</b> thefile.wav");
  // $('#track').html("<b>File:</b> " + fileName);
  //Yes, I know I could easily convert this to minutes and seconds
  $('#pos').html('Duration: ' + Math.round(theMedia.getDuration()) + ' seconds');
}

function onMediaSuccess() {
  console.log("onMediaSuccess");
  window.clearInterval(theTimer);
  theTimer = null;
}

function onMediaError(e) {
  var msgText = "Media error: " + e.message + "(" + e.code + ")";
  console.log(msgText);
  navigator.notification.alert(msgText, null, "Media Error");
}

function onMediaStatus(statusCode) {
  console.log("Status: " + statusCode);
}

function doPlay() {
  if(theMedia) {
    console.log("doPlay");
    //Start the media file playing
    theMedia.play();
    //fire off a timer to update the UI every second as it plays
    theTimer = setInterval(updateUI, 1000);
  } else {
    alert("No media file to play");
  }
}

function doPause() {
  if(theMedia) {
    console.log("doPause");
    //Pause media play
    theMedia.pause();
    window.clearInterval(theTimer);
  }
}

function doStop() {
  if(theMedia) {
    console.log("doStop");
    //Kill the timer we have running
    theTimer = null;
    //Then stop playing the audio clip
    theMedia.stop();
  }
}

function updateUI() {
  console.log("updateUI");
  theMedia.getCurrentPosition(onGetPosition, onMediaError);
}

function onGetPosition(filePos) {
  console.log("onGetPosition");
  //We won't have any information about the file until it's
  // actually played. Update the counter on the page
  $('#pos').html('Time: ' + Math.floor(filePos) + ' of ' + theMedia.getDuration() + ' seconds');
}