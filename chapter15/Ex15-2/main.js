
 //Some HTML constants we'll use
      var br = "<br />";
      var hr = "<hr />";
      var endA = "</a>";
      //Global contactList object used to hold the search results
      //as the application moves between screens
      var contactList;
	  
      function searchContacts() {
        alert("searchContacts");
        //Clear out the previous search results
        $('#contacts').html('<p>Search Results</p>');
        //Get the search string from the page
        var searchStr = document.getElementById("editSearch").value;
        //Figure out which search option is selected
        var searchScope = document.getElementById("searchScope").selectedIndex;
        //Then populate the searchOptions with the list of fields
        // being searched
        var contactFields = [];
        switch(searchScope) {
          case 1:
            //Search on Name
            contactFields = ['displayName', 'name', 'nickname'];
            break;
          case 2:
            //Search on Address
            contactFields = ['streetAddress', 'locality', 'region', 'postalCode', 'country'];
            break;
          case 3:
            //Notes field
            contactFields = ['note'];
            break;
          default:
            //search all fields
            contactFields = ['*'];
        }
        //Populate the search options object
        var searchOptions = {
          filter : searchStr,
          multiple : true,
        };
        //Execute the search
        navigator.contacts.find(contactFields, onContactSearchSuccess, onContactSearchError, searchOptions);
      }

      function onContactSearchSuccess(contacts) {
        // alert("onContactSearchSuccess");
        //Populate the contact list element of the contact list
        //page
        var i, len, theList;
        //Store the contact data in our global variable so the
        //other functions have something to work with
        contactList = contacts;
        //Did we get any results from the search?
        len = contacts.length;
        if(len > 0) {
          theList = '<ul data-role="listview">';
          for( i = 0, len; i < len; i += 1) {
            //on iOS displayName isn't supported, so we can't use
            // it
            if(contacts[i].displayName == null) {
              theList += '<li><a onclick="showContact(' + i + ');">' + contacts[i].name.familyName + ", " + contacts[i].name.givenName + '</a></li>';
            } else {
              theList += '<li><a onclick="showContact(' + i + ');">' + contacts[i].displayName + '</a></li>';
            }
          }
          theList += '</ul>';
          $('#contacts').replaceWith(theList);          
          //Then switch to the Contact Details page
          $.mobile.changePage("#contactList", "slide", false, true);
        } else {
          navigator.notification.alert('Search returned 0 results', null, 'Contact Search');
        }
      }

      function onContactSearchError(e) {
        var msgText;
        //Now build a message string based upon the error
        //returned by the API
        switch(e.code) {
          case ContactError.UNKNOWN_ERROR:
            msgText = "An Unknown Error was reported while saving the contact.";
            break;
          case ContactError.INVALID_ARGUMENT_ERROR:
            msgText = "An invalid argument was used with the Contact API.";
            break;
          case ContactError.TIMEOUT_ERROR:
            msgText = "Timeout Error.";
            break;
          case ContactError.PENDING_OPERATION_ERROR:
            msgText = "Pending Operation Error.";
            break;
          case ContactError.IO_ERROR:
            msgText = "IO Error.";
            break;
          case ContactError.NOT_SUPPORTED_ERROR:
            msgText = "Not Supported Error.";
            break;
          case ContactError.PERMISSION_DENIED_ERROR:
            msgText = "Permission Denied Error.";
            break;
          default:
            msgText = "Unknown Error (" + e.code + ")";
        }
        //Now tell the user what happened
        navigator.notification.alert(msgText, null, "Contact Search Error");
      }

      function showContact(index) {
        var len, i;
        //Populate the Contact Details page with information
        //about this contact

        //get a handle to the selected contact
        var contact = contactList[index];

        //First set the header content for the page to match the
        //contact's full name
        //Unfortunately iOS doesn't use displayName, so this had
        // to be rewritten
        if(contact.displayName == null) {
          $('#contactName').text(contact.name.givenName + " " + contact.name.familyName);
        } else {
          $('#contactName').text(contact.displayName);
        }

        //Then populate the body of the content area with
        //detailed fields from the data source
        var dt;
        dt = '<b>First Name:</b> ' + contact.name.givenName + br;
        dt += '<b>Last Name:</b> ' + contact.name.familyName + br;

        //Let's do email addresses
        if(contact.emails != null) {
          len = contact.emails.length;
          if(len > 0) {
            for( i = 0, len; i < len; i += 1) {
              dt += '<b>Email (' + i + '):</b> <a href="mailto:' + contact.emails[i].value + '">' + contact.emails[i].value + '</a>' + br;
            }
          }
        } else {
          dt += '<b>Email :</b> not available' + br;
        }

        //Now phone numbers
        if(contact.phoneNumbers != null) {
          len = contact.phoneNumbers.length;
          if(len > 0) {
            for( i = 0, len; i < len; i += 1) {
              dt += '<b>' + contact.phoneNumbers[i].type + ':</b><a href = "tel:' + contact.phoneNumbers[i].value + '" > ' + contact.phoneNumbers[i].value + '</a>' + br;
            }
          }
        } else {
          dt += '<b>Phone Numbers:</b> not available' + br;
        }
        
        //Show all of the contact fields
        dt += hr;
        for(myKey in contact) {
          dt += "Contact[" + myKey + "] = " + contact[myKey] + br;
        }
        $('#detailContent').html(dt);
        //Then switch to the Contact Details page
        $.mobile.changePage("#contactDetail", "slide", false, true);
      }

      function uploadContact() {
        //Put code in here you would use to upload the selected
        // contact to a server (or somewhere else)

      }