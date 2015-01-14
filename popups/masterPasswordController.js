

function MasterPasswordController($scope, $interval, $http, gdocs, keepass) {
	$scope.masterPassword = "";
	$scope.busy = false;

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length) {
      var url = tabs[0].url.split('?');
      $scope.url = url[0];
      $scope.title = tabs[0].title;
      $scope.$apply();
    }
  });

	$scope.enterMasterPassword = function() {
	  $scope.clearMessages();
	  $scope.busy = true;
	  keepass.getPasswords($scope.masterPassword).then(function(entries) {
	    var url = parseUrl($scope.url);
	    var siteTokens = (url.hostname + "." + $scope.title).toLowerCase().split(/\.|\s|\//);
	    entries.forEach(function(entry) {
	      //apply a ranking algorithm to find the best matches
	      entry.matchRank = 0;
	      entry.matchRank += (entry.URL == url.hostname) ? 1 : 0;
	      entry.matchRank += (entry.Title && $scope.title && entry.Title.toLowerCase() == $scope.title.toLowerCase()) ? 1 : 0;
	      entry.matchRank += (entry.Title == url.hostname) ? 1: 0;
        entry.matchRank += (entry.URL && url.hostname.indexOf(entry.URL.toLowerCase()) > -1) ? 0.9: 0;
	      entry.matchRank += (entry.Title && url.hostname.indexOf(entry.Title.toLowerCase()) > -1) ? 0.9 : 0;

	      var entryTokens = (entry.URL + "." + entry.Title).toLowerCase().split(/\.|\s|\//);
	      for (var i=0; i<entryTokens.length; i++) {
	        for (var j=0; j<siteTokens.length; j++) {
	          var token1 = entryTokens[i];
	          var token2 = siteTokens[j];

	          entry.matchRank += (token1 && token2 && token1 == token2) ? 0.2 : 0;
	        }
	      }
	    });

	    $scope.entries = entries.filter(function(entry) {
	      return (entry.matchRank > 0.8)
	    });
      $scope.successMessage = "" //$scope.entries.length == 1 ? "1 match found" : $scope.entries.length + " matches found";
	    if ($scope.entries.length == 0) {
  	    $scope.entries = entries.filter(function(entry) {
  	      return (entry.matchRank > 0.4);
  	    });
	      $scope.successMessage = "No close matches, showing " + $scope.entries.length + " partial matches";
	    }
	    if ($scope.entries.length == 0) {
	      $scope.errorMessage = "No matches found for this site."
	      $scope.successMessage = "";
	    }
	    $scope.busy = false;
	    $scope.$apply();
	  }).catch(function(err) {
	    $scope.errorMessage = err.message || "Incorrect password";
	    $scope.busy = false;
	    $scope.$apply();
	  });
	};

  $scope.clearMessages = function() {
	  $scope.errorMessage = "";
	  $scope.successMessage = "";
  }

  $scope.copyPassword = function(entry) {
    $scope.copyEntry = entry;
    entry.copied = true;
    document.execCommand('copy');
  }

  //listens for the copy event and does the copy
  document.addEventListener('copy', function(e) {
    var textToPutOnClipboard = $scope.copyEntry.Password;
    $scope.copyEntry = null;
    e.clipboardData.setData('text/plain', textToPutOnClipboard);
    e.preventDefault();

    chrome.alarms.create("clearClipboard", {
      delayInMinutes: 1
    });

    //actual clipboard clearing occurs on the background task via alarm, this is just for user feedback:
    $scope.successMessage = "Copied to clipboard.  Clipboard will clear in 60 seconds."
    var seconds = 60;
    var instance = $interval(function() {
      seconds -= 1;
      if (seconds <= 0) {
        $scope.successMessage = "Clipboard cleared"
        $interval.cancel(instance);
      } else {
        $scope.successMessage = "Copied to clipboard.  Clipboard will clear in " + seconds+ " seconds."
      }
    }, 1000);
  });

  function parseUrl(url) {
    //from https://gist.github.com/jlong/2428561
    var parser = document.createElement('a');
    parser.href = url;

    /*
    parser.protocol; // => "http:"
    parser.hostname; // => "example.com"
    parser.port;     // => "3000"
    parser.pathname; // => "/pathname/"
    parser.search;   // => "?search=test"
    parser.hash;     // => "#hash"
    parser.host;     // => "example.com:3000"
    */

    return parser;
  }
}

MasterPasswordController.$inject = ['$scope', '$interval', '$http', 'gdocs', 'keepass'];
// For code minifiers.

