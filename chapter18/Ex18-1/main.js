//===============================================
// Example 18-1
// JavaScript source: main.js
//===============================================
//creating a global variable here to use to store the array of
// entries as the application moves from screen to screen. Yes, I
// know it's cheating, but this was the easiest way to do this.
var theEntry;
var theEntries;
var theFileSystem;
var br = '<br />';
var hr = '<hr />';
var startP = '<p>';
var endP = '</p>';

function processDir(fileSystemType) {
  alert("processDir: " + fileSystemType);
  //Get a handle to the local file system (allocate 1 Mb for
  // storage)
  window.requestFileSystem(fileSystemType, 1024 * 1024, onGetFileSystemSuccess, onFileError);
}

function onGetFileSystemSuccess(fs) {
  alert("onGetFileSystemSuccess: " + fs.name);
  //Save the file system object so we can access it later
  //Yes, I know it's cheating, but it's an easier way to do this
  theFileSystem = fs;
  //Create a directory reader we'll use to list the files in the
  // directory
  var dr = fs.root.createReader();
  // Get a list of all the entries in the directory
  dr.readEntries(onDirReaderSuccess, onFileError);
}

function onDirReaderSuccess(dirEntries) {
  alert("onDirReaderSuccess (" + dirEntries.length + ")");
  //Whack the previous dir entries
  $('#dirEntries').empty();
  //Save the entries to the global variable I created.
  theEntries = dirEntries;
  var i, fl, len;
  len = theEntries.length;
  if(len > 0) {
    fl = '<ul data-role="listview" id="dirEntryList">';
    for( i = 0; i < len; i++) {
      if(theEntries[i].isDirectory == true) {
        fl += '<li><a href="#" onclick="processEntry(' + i + ');">Directory: ' + theEntries[i].name + '</a></li>';
      } else {
        fl += '<li><a href="#" onclick="processEntry(' + i + ');">File: ' + theEntries[i].name + '</a></li>';
      }
    }
    fl += "</ul>";
    //Update the page content with our directory list
    $('#dirEntries').html(fl);
    //$('#dirEntryList').listview('refresh');
    $('#dirEntryList').trigger('create');
  } else {
    fl = "<p>No entries found</p>";
    $('#dirEntries').html(fl);
  }
  //Delete any previous fileWriter details we may have on the page
  $('#writeInfo').empty();
  //Display the directory entries page
  $.mobile.changePage("#dirList", "slide", false, true);
}

function processEntry(entryIndex) {
  //clear out the writeInfo div in case we go back to the list
  // page
  $('#writeInfo').empty();
  //Get access to the inidividual file entry
  theEntry = theEntries[entryIndex];
  //FileInfo variable
  var fi = "";
  fi += startP + '<b>Name</b>: ' + theEntry.name + endP;
  fi += startP + '<b>Full Path</b>: ' + theEntry.fullPath + endP;
  fi += startP + '<b>URI</b>: ' + theEntry.toURI() + endP;
  if(theEntry.isFile == true) {
    fi += startP + 'The entry is a file' + endP;
  } else {
    fi += startP + 'The entry is a directory' + endP;
  }
  //Update the page content with information about the file
  $('#fileInfo').html(fi);
  //Display the directory entries page
  $.mobile.changePage("#fileDetails", "slide", false, true);
  //Now go off and see if you can get meta data about the file
  theEntry.getMetadata(onGetMetadataSuccess, onFileError);
}

function onGetMetadataSuccess(metadata) {
  // alert("onGetMetadataSuccess");
  var md = '';
  for(aKey in metadata) {
    md += '<b>' + aKey + '</b>: ' + metadata[aKey] + br;
  }
  md += hr;
  //Update the page content with information about the file
  $('#fileMetadata').html(md);
}

function writeFile() {
  //Get a file name for the file
  var theFileName = createRandomString(8) + '.txt';
  alert("writeFile: " + theFileName);
  theFileSystem.root.getFile(theFileName, {
    create : true
  }, onGetFileSuccess, onFileError);
}

function onGetFileSuccess(theFile) {
  alert("onGetFileSuccess: " + theFile.name);
  theFile.createWriter(onCreateWriterSuccess, onFileError);
}

function onCreateWriterSuccess(writer) {
  alert("onCreateWriterSuccess");

  writer.onwritestart = function(e) {
console.log("Write start");
  };

  writer.onwriteend = function(e) {
    console.log("Write end");
  };

  writer.onwrite = function(e) {
console.log("Write completed");
  };

  writer.onerror = function(e) {
    console.log("Write error: " + e.toString() + br);
  };
  writer.write("File created by Example 18-1: ");
  writer.write("This is another line of text ");
  writer.write(createRandomStory(25));
}

function removeFile() {
  theEntry.remove(onRemoveFileSuccess, onFileError);
}

function onRemoveFileSuccess(entry) {
  alert("Successfully removed " + entry.name);
}

function viewFile() {
  $('#viewFileName').html('<h1>' + theEntry.name + '</h1>');
  //Display the directory entries page
  $.mobile.changePage("#viewFile", "slide", false, true);
  theEntry.file(onFileReaderSuccess, onFileError);
}

function onFileReaderSuccess(file) {
  var reader = new FileReader();

  reader.onloadend = function(e) {
    $('#readInfo').append("Load end" + br);
    $('#fileContents').text(e.target.result);
  };

  reader.onloadstart = function(e) {
    $('#readInfo').append("Load start" + br);
  };

  reader.onloaderror = function(e) {
    $('#readInfo').append("Load error: " + e.target.error.code + br);
  };

  reader.readAsText(file);
}

function onFileError(e) {
  var msgText;
  switch(e.code) {
    case FileError.NOT_FOUND_ERR:
      msgText = "File not found error.";
      break;
    case FileError.SECURITY_ERR:
      msgText = "Security error.";
      break;
    case FileError.ABORT_ERR:
      msgText = "Abort error.";
      break;
    case FileError.NOT_READABLE_ERR:
      msgText = "Not readable error.";
      break;
    case FileError.ENCODING_ERR:
      msgText = "Encoding error.";
      break;
    case FileError.NO_MODIFICATION_ALLOWED_ERR:
      msgText = "No modification allowed.";
      break;
    case FileError.INVALID_STATE_ERR:
      msgText = "Invalid state.";
      break;
    case FileError.SYNTAX_ERR:
      msgText = "Syntax error.";
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msgText = "Invalid modification.";
      break;
    case FileError.QUOTA_EXCEEDED_ERR:
      msgText = "Quote exceeded.";
      break;
    case FileError.TYPE_MISMATCH_ERR:
      msgText = "Type mismatch.";
      break;
    case FileError.PATH_EXISTS_ERR:
      msgText = "Path exists error.";
      break;
    default:
      msgText = "Unknown error.";
  }
  //Now tell the user what happened
  navigator.notification.alert(msgText, null, "File Error");
}

function onFileTransferError(e) {
  alert("Error");
  var msgText;
  switch(e.code) {
    case FileTransferError.FILE_NOT_FOUND_ERR:
      msgText = "File not found.";
      break;
    case FileTransferError.INVALID_URL_ERR:
      msgText = "Invalid URL.";
      break;
    case FileTransferError.CONNECTION_ERR:
      msgText = "Connection error.";
      break;
    default:
      msgText = "Unknown error.";
  }
  //Now tell the user what happened
  navigator.notification.alert(msgText, null, "File Transfer Error");
}