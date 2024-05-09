var useLocalFirebaseEmulator = getIsEmulatorFromURL();  // When running local emulator with "firebase emulators:start", set this to "true
var hostURL = useLocalFirebaseEmulator ? 'http://127.0.0.1:5001/eagleeyessearch/us-central1' : 'https://us-central1-eagleeyessearch.cloudfunctions.net';

// var hostURL = 'https://us-central1-aaaaggfdsfdsdaa.cloudfunctions.net';

var machineId = getMachineIdFromURL();

var globalUser = null;

var globalData = null;

var selectedLicenseId = null;

var selectedLicenseInfo = null;

const urlParams = new URLSearchParams(window.location.search);

console.log("Machine ID: " + machineId);

thisURLwithJustMachineIDArg = window.location.origin + '/get_licensed/?machine_id=' + machineId;

// Wait for the HTML to load
document.addEventListener("DOMContentLoaded", function () 
{
    // add eventlisterner for issue key button   
    var issueKeyButton = document.getElementById('issueKeyButton');
    issueKeyButton.addEventListener('click', function() {
        getKeyForThisLicense(selectedLicenseId, globalUser);
    });

     // add eventlisterner for copy key button   
    var copyKeyButton = document.getElementById('license-key-copy-button');
    copyKeyButton.addEventListener('click', function() {
        copyTextToClipboard();
    });
});

function fillMachineIDFromArgs() {
    // Get machine id, if any from url and fill it in with jquery to the machine-id box
    machine_id = urlParams.get('machine_id');
    console.log("Machine ID from URL? "+machine_id);
    if (machine_id) {
        $('#machine-id').text(machine_id);
    }
    // Get the argument and convert it to a boolean.  It should default to true if not present.
    // var isEarlyAdopterMode = urlParams.get('early_adopter') === 'true';
    // var isEarlyAdopterMode = urlParams.get('early_adopter') !== 'false';
    // var licenseIdFromUrl = urlParams.get('license_id');

    // console.log("License ID from URL? "+licenseIdFromUrl);
    // // checks for license_id= followed by one or more alphanumeric characters. 
    // // licenseId is set to match[1] if the license_id is found; otherwise, it is set to null.

    // if (licenseIdFromUrl && /^[a-zA-Z0-9]+$/.test(licenseIdFromUrl)) {
    //     console.log("license_id included:", licenseIdFromUrl);
    //     $('#license-id').val(licenseIdFromUrl);
    //     // checkLicense(globalUser);
    //     $('#licenses').show();
    //     // $('html, body').animate({
    //     //     scrollTop: $("#licenses").offset().top
    //     // }, 1000); // 1000 milliseconds = 1 second
    //     // Add logic for handling other values or missing parameter here
    // } else {
    //     console.log('license_id not included or invalid.');
    //     // Add additional logic for handling missing or invalid license_id here
    // }
    
    // // Display the machine ID in the HTML
    // document.getElementById('machine-id').textContent = machineId;
    
}



function checkLicenseIDFromArgsAndUpdateAvailableLicenses() {

    licenseIdFromUrl = urlParams.get('license_id');
    if (licenseIdFromUrl) {
        $('#license-id').val(licenseIdFromUrl);
        checkLicense(globalUser);
        $('#licenses').show();
    } else {
        checkLicense(globalUser);
        console.log('license_id not included or invalid.');
    }



    // const urlParams = new URLSearchParams(window.location.search);

    // // Get the argument and convert it to a boolean.  It should default to true if not present.
    // // var isEarlyAdopterMode = urlParams.get('early_adopter') === 'true';
    // // var isEarlyAdopterMode = urlParams.get('early_adopter') !== 'false';
    // var licenseIdFromUrl = urlParams.get('license_id');

    // console.log("License ID from URL? "+licenseIdFromUrl);
    // // checks for license_id= followed by one or more alphanumeric characters. 
    // // licenseId is set to match[1] if the license_id is found; otherwise, it is set to null.

    // if (licenseIdFromUrl && /^[a-zA-Z0-9]+$/.test(licenseIdFromUrl)) {
    //     console.log("license_id included:", licenseIdFromUrl);
    //     $('#license-id').val(licenseIdFromUrl);
    //     // checkLicense(globalUser);
    //     $('#licenses').show();
    //     // $('html, body').animate({
    //     //     scrollTop: $("#licenses").offset().top
    //     // }, 1000); // 1000 milliseconds = 1 second
    //     // Add logic for handling other values or missing parameter here
    // } else {
    //     console.log('license_id not included or invalid.');
    //     // Add additional logic for handling missing or invalid license_id here
    // }
    
    // // Display the machine ID in the HTML
    // document.getElementById('machine-id').textContent = machineId;
    
}




function getParamFromURL(paramName, defaultValue = undefined) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName) || defaultValue;
}

function getMachineIdFromURL() {
    // const urlParams = new URLSearchParams(window.location.search);
    // // upper case
    // return urlParams.get('machine_id').toUpperCase();
    return getParamFromURL('machine_id')?.toUpperCase();
}

function getIsEmulatorFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('is_emulator') === 'true';
}

function reCheckLicense() {
    // First, temporarily hide the licenses section
    $('#licenses').hide();

    // Wait 1/4 second so the user sees the section disappear
    setTimeout(function () {
        // Then, re-check the license
        checkLicense(globalUser);
        $('#licenses').show();
        scrollToBottomWithDelay();
    }, 250);


    // // Then, re-check the license
    // checkLicense(user);
    // Un-hide the re-check button (no longer display none)
}

function filterDataForTier(licenseAndTokenData, tier) {
    // Filter the data to only include licenses and tokens for the specified tier

    var filteredData = {};
    filteredData.licenses_and_dispensed = {};
    filteredData.tokens_and_codes = {};
    for (var licenseId in licenseAndTokenData.licenses_and_dispensed) {
        var license = licenseAndTokenData.licenses_and_dispensed[licenseId].license;
        if (license.tier.toLowerCase() === tier.toLowerCase()) {
            filteredData.licenses_and_dispensed[licenseId] = licenseAndTokenData.licenses_and_dispensed[licenseId];
        }
    }
    for (var tokenId in licenseAndTokenData.tokens_and_codes) {
        var tokenAndCode = licenseAndTokenData.tokens_and_codes[tokenId];
        if (tokenAndCode.token.tier.toLowerCase() === tier.toLowerCase()) {
            filteredData.tokens_and_codes[tokenId] = tokenAndCode;
        }
    }
    return filteredData;
}

function copyTextToClipboard() {
    var licenseKey = document.getElementById("license-key");
    navigator.clipboard.writeText(licenseKey.value)
        .then(() => {
            console.log('Text copied to clipboard successfully!');
            $('#license-key-status').text("Key " + licenseKey.value.slice(0, 10) + '...' + " has been copied to the clipboard. You can now paste it into the Eagle Eyes app.").addClass('info-box');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}

function licenseTokenToString(token) {
    expiryDateStr = new Date(token.expiry_timestamp * 1000).toLocaleDateString();
    return `Tier: ${token.tier}\nEmail: ${token.email}\nMachine ID: ${token.machine_id}\nExpiry: ${expiryDateStr}\nLicense ID: ${token.license_id}`;
}

// function sendTokenAndCodeToUserEmail(tokenAndCode) {
//     // Send the token and code to the user's email
//     // First, get the user's ID token

//     user.getIdToken().then(function (idToken) {
//         // Then, send a request to the cloud function to send the token and code to the user's email
//         var fetch_url = 'http://

function onNewKeyReceived(tokenAndCodeJSONString) {
    // When a new key is received, re-check the license
    let tokenAndCode = JSON.parse(tokenAndCodeJSONString);
    let code = tokenAndCode.code;
    let token = tokenAndCode.token;
    $('#final-status-box').hide()

    $('#key-view').css('display', 'block');
    $('#license-info').val(licenseTokenToString(token));
    $('#license-key').val(code);

    // Copy the code to the clipboard
    copyTextToClipboard();
    $('#license-key-status').text("Key " + code.slice(0, 10) + '...' + " has been copied to the clipboard. You can now paste it into the Eagle Eyes app.").addClass('info-box');
    // Copy button 
    $('#license-key-copy-button').text('Copy Key to Clipboard');
    // $('html, body').animate({
    //     scrollTop: $("#issue-key").offset().top
    // }, 1000); // 1000 milliseconds = 1 second
    // scrollToBottomWithDelay();

    console.log("Showed new key: ", code.slice(0, 10) + '...');

    // now, you also need to re-check the license - so that it confirms that the key has been used.
    // Note that this is only really necessary if the user generated a new key but whatever
    //reCheckLicense();

    // alert('New key received.  Code ' + code.slice(0, 10) + '... has been copied to the clipboard.  You can now paste it into the Eagle Eyes app.');
    // Scroll to the bottom of the page
    // window.scrollTo(0, document.body.scrollHeight);
    scrollToBottomWithDelay();
}

function getKeyForThisLicense(licenseID, user) {
    // Make sure not to proceed if machine ID is missing
    
    $('#final-status-box').text('⏳ Issuing key...').css('display', 'block').show()
    if (!machineId || machineId == "") { 
        alert('There is no machine ID connected to your session. Please request a key from the "Check License" menu in Eagle Eyes Scan desktop app.');
        return;
    }
    // Get the key for this license
    // First, get the user's ID token
    // We're calling the "request_token_from_license" cloud function with args machine_id and license_id
    console.log('Requesting key for license ID: ', licenseID);
    $('#issueKeyButton').addClass('non_important_button');
    // First - lets check if there is already a key for this license on this machine
    console.log('Global data: ', globalData);
    console.log('Tokens and codes: ', globalData.tokens_and_codes);
    allLicenseIdsInTokens = Object.values(globalData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
    isThereAlreadyAKeyForThisLicense = allLicenseIdsInTokens.includes(licenseID);
    n_tokens_remaining = globalData.licenses_and_dispensed[licenseID].license.n_tokens - globalData.licenses_and_dispensed[licenseID].n_tokens_dispensed;

    // If there is not a key, warn the user that they are about to request a key and this will decrement the number of available keys
    if (!isThereAlreadyAKeyForThisLicense) {
        var confirmRequest = confirm("Are you sure you want to request a key for this license?\n\nThis will use up 1 of the " + n_tokens_remaining + " remaining keys for this license, and cannot be reversed.\n\nProceed?");
        if (!confirmRequest) {
            return;
        }
    }

    if (!user) {
        user = globalUser;
    }

    user.getIdToken(true).then(function (idToken) {
        // Then, send a request to the cloud function to get the key
        // var fetch_url = 'http://127.0.0.1:5001/eagleeyessearch/us-central1/request_token_from_license?machine_id=' + machineId + '&license_id=' + licenseID;
        var fetch_url = hostURL + '/request_token_from_license?machine_id=' + machineId + '&license_id=' + licenseID;
        // var fetch_url = hostURL+'/request_AAAAA?machine_id=' + machineId + '&license_id=' + licenseID;

        console.log("Checking URL: " + fetch_url + " with ID token: " + idToken.slice(0, 10) + '...');
        console.log("Fetch URL: " + fetch_url);
        $.ajax({
            url: fetch_url,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + idToken
            },
            success: onNewKeyReceived,
            error: requestErrorHandler,
        });
    })
}

function scrollToBottomWithDelay() {
    // Scroll to the bottom of the page after a small delay of half a second
    // setTimeout(function () {
    //     window.scrollTo(0, document.body.scrollHeight);
    // }, 1000);
    // Use the animation approach 
    $('html, body').animate({
        scrollTop: $("#end-of-page").offset().top
    }, 1000); // 1000 milliseconds = 1 second

}
    

function showError(message) {


    // Show an error message to the user
    // $('#final-status-box').text(message).classList.add('error-box').show();
    // Fix for jquery
    $('#final-status-box').text(message).addClass('error-box').css('display', 'block').show();
    
    // var errorBox = document.createElement('div');
    // errorBox
    // // Width 80% of the screen
    // errorBox.style.width = '80%';
    // // Center horizontally
    // errorBox.style.margin = '0 auto';

    // errorBox.textContent = message;
    // // Append to end of 'end-of-page' div
    // document.getElementById('end-of-page').appendChild(errorBox);

    // Show the "try again" button (try-again-button) (just make it not hidden)
    $('#try-again-button').css('display', 'block');

    // Scroll to the bottom of the page
    scrollToBottomWithDelay();
}

// side-effect: reads value of license-id box and checks 
function checkLicense(user) {
    // $('#licenses').show();
    scrollToBottomWithDelay();
    // $('html, body').animate({
    //     scrollTop: $("#licenses").offset().top
    // }, 1000); // 1000 milliseconds = 1 second
    // If user is null, use globalUser
    if (!user) {
        user = globalUser;
    }
    console.log('Checking license for user: ', user, ' with globalUser: ', globalUser);
    // $('#checking-licenses-box').show();

    $('#license-info').text("⏳ Checking available licenses...")

    // calls function to check for licenses, with value in manual license-id box as optional
    user.getIdToken().then(function (idToken) {
        //   var fetch_url = 'http://127.0.0.1:5001/eagleeyessearch/us-central1/check_available_licenses_and_tokens?machine_id=' + machineId;
        const licenseID = $('#license-id').val();
        var fetch_url = hostURL + '/check_available_licenses_and_tokens?machine_id=' + machineId + (licenseID ? '&license_id=' + licenseID : '');
        // console.log("Fetch URL: " + fetch_url);
        console.log("Checking URL: " + fetch_url + " with ID token: " + idToken.slice(0, 10) + '...');
        $.ajax({
            url: fetch_url,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + idToken
            },
            // success: onReceivingLicenseData,
            // Make onReceiving also get the licenseID as a oneliner
            success: function (data) {onReceivingLicenseData(data, licenseID);},
            error: requestErrorHandler,
            // Finally
            complete: function () {
                console.log("complete");
                // Hide the "checking licenses" box
                // $('#select-licenses').show();
                // $("#licenses").show();
            }
        });
    });
}

function requestErrorHandler(jqXHR, textStatus, errorThrown) {
    // Handle different error scenarios
    errorText = 'Error during license check: ';
    if (textStatus === 'timeout') {
        // showError('The request timed out.  You');
        errorText += 'The request timed out.  You may have a slow internet connection.';
    } else if (textStatus === 'error') {
        // Server might be down or unreachable (e.g., network error)
        if (!jqXHR.status) {
            // showError('Network error: The server might be down or unreachable - do you have an internet connection?');
            errorText += 'Network error: The server at ' + hostURL + ' might be down or unreachable.  ' + jqXHR.statusText;
        } else {
            // HTTP error response from the server, handle accordingly
            let status = jqXHR.status;
            let errorMessage = jqXHR.responseText || jqXHR.responseJSON?.error || jqXHR.statusText || "Unknown error";
            // showError(`Error ${status} during license check: ${errorMessage}`);
            errorText += `Error ${status} during license check: ${errorMessage}`;
        }
    } else {
        // Handle other statuses as needed
        // showError('Unexpected error:', textStatus);
        errorText += 'Unexpected error: ' + textStatus;
    }
    errorText += "\n\nIf you believe you should not be getting this error, please copy the above error message and email us at info@eagleeyessearch.com.";
    // It might be a good idea to show a user-friendly error message
    // showError('An error occurred during the license check. Please try again later.');
    showError(errorText);
}

function onReceivingLicenseData(data, licenseIDusedInRequest) {
            /* Expected format of example data: 

    {
    "tokens_and_codes": {
        "MJPQNXHFUOC6SWLN": {
        "token": {
            "tier": "Basic",
            "expiry_timestamp": 1711929600.0,
            "email": "*",
            "machine_id": "nd34kjs",
            "license_id": sdjk34d,
            "license_name": "Universal Basic License",
            "key": null,
            "_version": 1
        },
        "code": "SZX7VSFWFPSBJXVAVY4SHHW3EAGSU6ZYWEYHMGNG3FVWKYJ3HG47344NOT3QDUAASOMLK7DDPIHK7TT5RCEIC4DH6GMHAZ6DYW3BKVMHRNMEJJMAMTHG7RDAXBUGMWXRA2W3NQEM2UB2XTSVWEKVEBKOIDQGDJGAPTJBMMJAGYW4HSPEY2PMYOSJWL3MQHRRFDCPMO2ZV6WWGK2KJFYRHRW6YFYA27YSV423QEUZONJPVJ2DW52L3ODIEV23ASQE47ANFJ5OAG5ERFFWW3NWWFHEE7QR3MNX7QIXVLZDGW3LIZ6Q655FDMZ5LEDKSFRDHO6JQBCJULTRWAZRQOIPYY35XFKU6IWX7FC3K4D4EWJRNDAMJJTMQARGQSXABSJMOT4IJBJQBVA2752VBVTRROANRF34XP2IMZD27TWYU5PSDPDRY2DLVVERCSVHQL5GSSRHV5ETTGTPQJT76KG73EHBSU7SV2KVQUBOFQBOWPP4SCH2J7I5FTYPCG4A"
        }
    },
    "licenses_and_dispensed": {
        "jkg8nI9Yw2y9K3f7": {
        "license": {
            "tier": "SAR",
            "expiry_timestamp": 1711929600.0,
            "emails": [
            "peter.ed.oconnor@gmail.com"
            ],
            "domains": [],
            "license_name": "Peter's License",
            "n_tokens": 3,
            "key": null,
            "_version": 0
        },
        "n_tokens_dispensed": 0
        }
    }
    }
    */

    // console.log('Data received: ', data);
    const licenseData = JSON.parse(data); // Ensure data is parsed correctly
    console.log(`Received license data with ${Object.keys(licenseData.licenses_and_dispensed).length} licenses and ${Object.keys(licenseData.tokens_and_codes).length} tokens, with a request for license ID: "${licenseIDusedInRequest}"`);
    

    globalData = licenseData; // Save for global use
    var select = $('#license-select'); // the license selector
    var textarea = $('#license-info'); // contents of license info box
    var checkingBox = $('#licenses-found-info'); // blue info-box field
    checkingBox.show()
    selectLicenseButton = $('#selectLicenseButton');
    select.innerHTML = '';

    const arrayOfLicenseIds = Object.keys(licenseData.licenses_and_dispensed);
    var numberOfLicenses = arrayOfLicenseIds.length;

    console.log("Number of licenses: ", numberOfLicenses);
    // Remove hidden attribute
    // $("#licenses-found-info").text(`We found ${numberOfLicenses} licence${numberOfLicenses === 1 ? '' : 's'} connected to your email address`).show();

    licenseIDsWithTokensOnThisMachine = Object.values(licenseData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);

    // Make a function for getting the number of tokens remaining given a license ID.  If n_tokens is null, return null
    function getNumberOfTokensRemainingOrNull(licenseId) {
        // console.log("Looking up number of tokens for license ID: ", licenseId);
        // console.log(`From licenseData with keys ${Object.keys(licenseData.licenses_and_dispensed)}`)
        // console.log(`Array of license IDs: ${arrayOfLicenseIds}`)

        n_tokens_dispensed = licenseData.licenses_and_dispensed[licenseId].n_tokens_dispensed;
        n_tokens_total = licenseData.licenses_and_dispensed[licenseId].license.n_tokens;
        return n_tokens_total === null ? null : n_tokens_total - n_tokens_dispensed;
        // return licenseData.licenses_and_dispensed[licenseId].license.n_tokens === null ? null : licenseData.licenses_and_dispensed[licenseId].license.n_tokens - licenseData.licenses_and_dispensed[licenseId].n_tokens_dispensed;
    }

    // Create a function to compare two licenses for which is "better" (higher priority)
    function compareLicenses(licenseId1, licenseId2) {
        // Access license data and properties
        const license1 = licenseData.licenses_and_dispensed[licenseId1].license;
        const license2 = licenseData.licenses_and_dispensed[licenseId2].license;
        const license1HasTokenOnThisMachine = licenseIDsWithTokensOnThisMachine.includes(licenseId1);
        const license2HasTokenOnThisMachine = licenseIDsWithTokensOnThisMachine.includes(licenseId2);
        const license1HasKeyRemaining = getNumberOfTokensRemainingOrNull(licenseId1) > 0;
        const license2HasKeyRemaining = getNumberOfTokensRemainingOrNull(licenseId2) > 0;
    
        // Compare whether the license has a token on this machine
        if (license1HasTokenOnThisMachine !== license2HasTokenOnThisMachine) {
            return license1HasTokenOnThisMachine ? -1 : 1;
        }
        
        // Compare whether the license has a token on this machine or keys remaining
        const license1Priority = license1HasTokenOnThisMachine || license1HasKeyRemaining;
        const license2Priority = license2HasTokenOnThisMachine || license2HasKeyRemaining;
        if (license1Priority !== license2Priority) {
            return license1Priority ? -1 : 1;
        }
        
        // Compare by expiry date as the final criterion
        return license2.expiry_timestamp - license1.expiry_timestamp;
    }

    // Sort the license IDs by the compare function
    arrayOfLicenseIds.sort(compareLicenses);

    // Clear the select box
    select.empty();
    if (numberOfLicenses > 0) {
        checkingBox.text(`We found ${numberOfLicenses} licence${numberOfLicenses === 1 ? '' : 's'} connected to your email address`);
        arrayOfLicenseIds.forEach(licenseId => {

            var license = licenseData.licenses_and_dispensed[licenseId].license;
            var option = document.createElement('option');
            option.value = licenseId;
            n_keys_remaining = getNumberOfTokensRemainingOrNull(licenseId);
            issuedStatus = licenseIDsWithTokensOnThisMachine.includes(licenseId) ? 'Key Issued' : `${n_keys_remaining} Key${n_keys_remaining === 1 ? '' : 's'}`;
            // Format expiry date like "May 5, 2024"
            expiryDateStr = new Date(license.expiry_timestamp * 1000).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
            option.text = `${licenseId.substring(0, 3)}: ${license.tier} (${issuedStatus}), Expires: ${expiryDateStr}`;
            select.append(option);
        });
        select.css('display', 'block');
        textarea.text('');
        selectLicenseButton.removeClass('non-clickable');
        selectLicenseButton.prop('disabled', false);

    } else {

        checkingBox.text("No licenses connected to this account");
        if (licenseIDusedInRequest) {
            textarea.text('No licenses connected to this account or matching license ID ' + licenseIDusedInRequest);
        } else {
            textarea.text('No licenses connected to this account');
        }
        selectLicenseButton.prop('disabled', true);
    }
    

    // The "off" is key here - it erases the old handler.
    select.off('change').change(function () {
        selectedLicenseId = select.val();
        // console.log('Selected license ID: ', selectedLicenseId);
        if (!selectedLicenseId) return; // Guard against no selection 
        
        selectedLicense = licenseData.licenses_and_dispensed[selectedLicenseId].license; // this = the select element // this.value= the selected license ID // licenseid.license is the license object that is part of the license ID
        let license_name = selectedLicense.license_name;
        let expiryDateStr = new Date(selectedLicense.expiry_timestamp * 1000).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
        let license_tier = selectedLicense.tier;
        let emails = selectedLicense.emails.join(', ');
        let n_tokens_remaining = getNumberOfTokensRemainingOrNull(selectedLicenseId);
        let n_tokens_total = selectedLicense.n_tokens;
        selectedLicenseInfo = `Name: ${license_name}\nExpiry: ${expiryDateStr}\nTier: ${license_tier}\nEmails: ${emails}\nLicense ID: ${selectedLicenseId}\nKeys Remaining: ${n_tokens_remaining} of ${n_tokens_total}\nKey issued on this Machine: ${licenseIDsWithTokensOnThisMachine.includes(selectedLicenseId) ? 'Yes' : 'No'}`;
        textarea.text(selectedLicenseInfo);
        // Hide the step 4 box
        $('#issue-key').hide();
        $('#key-view').hide();
        $('#final-status-box').hide();
    });

    // Auto select the specified license ID, if available, otherwise, select the one with the latest expiry date with at least one key remaining
    if (numberOfLicenses > 0) {
        console.log("licenseIDusedInRequest: ", licenseIDusedInRequest);
        var licenseIdtoShow = null;
        if (licenseIDusedInRequest) {
            if ( arrayOfLicenseIds.includes(licenseIDusedInRequest)){
                licenseIdtoShow = licenseIDusedInRequest;
            } else {
                // Set text area text
                not_found_text = `License ID ${licenseIDusedInRequest} not found or expired.`;
                if (numberOfLicenses > 0) {
                    not_found_text += `  Select another license from the list above.`;
                }
                console.log(not_found_text);
                textarea.text(not_found_text);
                // $('#second-license-info-box').text(`License ID ${licenseIDusedInRequest} not found`);
            }
        } else {
            // Just select the first license (because it's sorted by priority already)
            licenseIdtoShow = arrayOfLicenseIds[0];

            // licenseIDsWithTokensOnThisMachine = Object.values(licenseData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
            // // Select the license with the latest expiry date that has at least one key remaining
            // // Rank licenses by: 
            // // 1. Do they have a token on this machine already?
            // // 2. Do they have a token on this machine already OR do they have a key remaining?
            // // 3. Latest expiry date
            // var candidateLicenseIds = arrayOfLicenseIds;
            // // If there are licenses with tokens on this machine, filter the candidate license IDs to only include those
            // if (licenseIDsWithTokensOnThisMachine.length > 0) {
            //     candidateLicenseIds = arrayOfLicenseIds.filter(licenseId => licenseIDsWithTokensOnThisMachine.includes(licenseId));
            // } else { // If there are no licenses with tokens on this machine, filter the candidate license IDs to only include those with keys remaining
            //     candidateLicenseIds = arrayOfLicenseIds.filter(licenseId => getNumberOfTokensRemainingOrNull(licenseId) > 0);
            // }
            // // If there are still candidate license IDs, select the one with the latest expiry date
            // if (candidateLicenseIds.length > 0) {
            //     licenseIdtoShow = candidateLicenseIds.reduce((a, b) => licenseData.licenses_and_dispensed[a].license.expiry_timestamp > licenseData.licenses_and_dispensed[b].license.expiry_timestamp ? a : b);
            // } 

            // licenseIdtoShow = ... TODO: Implement this
        }

        // const licenseIDToShow = licenseIDusedInRequest || arrayOfLicenseIds.filter((a) => getNumberOfTokensRemainingOrNull(a) !== 0 ).reduce((a, b) => licenseData.licenses_and_dispensed[a].license.expiry_timestamp > licenseData.licenses_and_dispensed[b].license.expiry_timestamp ? a : b);
        if (licenseIdtoShow) {
            console.log(`Showing license ID ${licenseIdtoShow}`)
            select.val(licenseIdtoShow);
            console.log(`LicenseData keys (before calling change) ${Object.keys(licenseData.licenses_and_dispensed)}`);
            select.change();
            // If the license ID was specified in the URL, select it
            if (licenseIDusedInRequest == licenseIdtoShow) {
                selectLicense();
            } else {
                // Hide the step 4 box
                console.log("Requested license not used")
                $('#issue-key').hide();
                $('#key-view').hide();
            }
        } else {
            console.log('No license to show');
            $('#issue-key').hide();
            $('#key-view').hide();
        }
    } else {
        console.log('Zero license available');
        $('#issue-key').hide();
        $('#key-view').hide();
    }
}


function selectLicense() {
    var selectField = document.getElementById('select-license-info');
    selectField.textContent = `License ID ${selectedLicenseId} selected`;
    var secondTextArea = document.getElementById(`second-license-info-box`);
    secondTextArea.value = selectedLicenseInfo;
    var issueKeyInfoBox = document.getElementById(`issue-key-info`);
    var code = isThereAlreadyAKey(selectedLicenseId);
    console.log("logging code :" + code);
    if (!code) {
        $('#issueKeyButton').removeClass('non_important_button').show();
        console.log("there is no key yet");
        $('#license-key').val("");
        issueKeyInfoBox.textContent = "Important: Before proceeding, please be aware that issued keys are specific to a device. The process of issuing a key is irreversible; once a key is issued, it cannot be revoked or transferred to another device.";
    }
    else {
        issueKeyInfoBox.textContent = "A key has already been issued for this license and this device.";
        $('#license-key').val(code);
        $('#key-view').show();
        $('#issueKeyButton').removeClass('non_important_button').hide();
        // $('html, body').animate({
        //     scrollTop: $("#key-view").offset().top
        // }, 1000); // 1000 milliseconds = 1 second
        // scrollToBottomWithDelay();
    }
    $('#select-license-info').show();
    $('#issue-key').show();
    // $('html, body').animate({
    //     scrollTop: $("#issue-key").offset().top
    // }, 1000); // 1000 milliseconds = 1 second
    console.log("Selected license: ", selectedLicenseInfo);
    scrollToBottomWithDelay();
    
}

function onSelectLicenseToken() {
    $('#issueKeyButton').removeClass('non_important_button invisible-button');
    var licenseTokensSelect = document.getElementById('license-tokens-select');
    console.log('Index: ', licenseTokensSelect.selectedIndex);
    if (licenseTokensSelect.selectedIndex === -1) {
        return;  // Means no token is selected
    }
    var selectedTokenAndCodeSerialized = licenseTokensSelect.options[licenseTokensSelect.selectedIndex].value;
    var selectedTokenAndCode = JSON.parse(selectedTokenAndCodeSerialized); // Parse the JSON string back to an object

    var selectedToken = selectedTokenAndCode.token;
    // var selectedCode = selectedTokenAndCode.code;
    console.log('Selected token and code: ', selectedTokenAndCode);
    console.log('Selected token: ', selectedTokenAndCode.token);
    console.log('Selected code: ', selectedTokenAndCode.code);

    // var selectedToken = JSON.parse(selectedTokenAndCode.token); // Parse the JSON string back to an object

    // var selectedToken = licenseTokensSelect.options[licenseTokensSelect.selectedIndex].value;
    console.log('Selected token: ', selectedToken, "Fields: ", selectedToken.tier, selectedToken.email, selectedToken.machine_id, selectedToken.expiry_date, selectedToken.code);

    // Now update the license token info textarea (newline separated)
    var licenseTokenInfo = document.getElementById('license-token-info');
    licenseTokenInfo.value = `Tier: ${selectedToken.tier}\nEmail: ${selectedToken.email}\nMachine ID: ${selectedToken.machine_id}\nExpiry: ${selectedToken.expiry_date}\nCode: ${selectedToken.code}`;

    // Now update the license key textarea
    var licenseKey = document.getElementById('license-key');
    licenseKey.value = selectedTokenAndCode.code;

}

function isThereAlreadyAKey(licenseID) {
    console.log('Global data: ', globalData);
    console.log('Tokens and codes: ', globalData.tokens_and_codes);
    allLicenseIdsInTokens = Object.values(globalData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
    var keyAlreadyIssued = allLicenseIdsInTokens.includes(licenseID);
    var TokensAndCode = globalData.tokens_and_codes;
    // n_tokens_remaining = globalData.licenses_and_dispensed[licenseID].license.n_tokens - globalData.licenses_and_dispensed[licenseID].n_tokens_dispensed;
    if (keyAlreadyIssued) {
        for (let key in TokensAndCode) {
            if (TokensAndCode[key].token.license_id === licenseID) {
                // console.log('there is already a key');
                $('#issueKeyButton').removeClass('non_important_button').hide();
                return TokensAndCode[key].code;  // Returns the code when the license ID matches
            }
        }
    }
    else {
        // console.log('there is no key');
        return false;
    }
}

function copyLicenseKey() {
    var licenseKey = document.getElementById("license-key");
    licenseKey.select();
    document.execCommand("copy");
    var licenseCode = licenseKey.value;
}

function toggleMenu(expandableMenuDivId, makeVisible = null) {
    // Use jQuery to select the menu and title elements within the specified div
    var $menu = $('#' + expandableMenuDivId + ' .menu-content').first();
    var $title = $('#' + expandableMenuDivId + ' .menu-title').first();

    if (makeVisible === null) {
        makeVisible = ($menu.css('display') === 'none' || $menu.css('display') === '')
    }

    // Toggle the display of the menu
    if (makeVisible) {
        $menu.css('display', 'block');
        $title.removeClass('collapsed');
    } else {
        $menu.css('display', 'none');
        $title.addClass('collapsed');
    }
}

// On load - check whether to show the emulator info box
$(document).ready(function () {
    if (useLocalFirebaseEmulator) {
        $('#using-emulator-info').show();
    }
});


function openMachineIdDialog() {
    var dialog = document.getElementById("machine-id-dialog");
    dialog.showModal();
}

function closeMachineIdDialog() {
    var dialog = document.getElementById("machine-id-dialog");
    dialog.close();
}

function updateMachineId() {
    // Get the new machine ID
    var newMachineId = document.getElementById("new-machine-id").value.toUpperCase();
    // Update the displayed machine ID
    document.getElementById("machine-id").textContent = newMachineId;
    // Close the dialog
    closeMachineIdDialog();
    // Create a new URLSearchParams object from the current query string
    var queryParams = new URLSearchParams(window.location.search);
    // Set the new machine ID (this will replace it if it already exists, or add it if it doesn't)
    queryParams.set('machine_id', newMachineId);
    // Create the new URL
    var newURL = window.location.origin + window.location.pathname + '?' + queryParams.toString();
    // Redirect to the new URL
    window.location.href = newURL;
}

issueKeyButton.click(function () {
    getKeyForThisLicense(select.val(), globalUser);
});

function onClickBuy() {

    console.log('Buy button clicked');

    purchaseButton = $('#purchase');
    
    // Add a "processsing" class
    purchaseButton.addClass('processing');
    url = `${window.location.origin}/buy_license?${window.location.search.slice(1)}`;
    console.log('Redirecting to: ', url);
    window.open(url);
}