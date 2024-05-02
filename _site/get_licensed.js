var useLocalFirebaseEmulator = getIsEmulatorFromURL();  // When running local emulator with "firebase emulators:start", set this to "true
var hostURL = useLocalFirebaseEmulator ? 'http://127.0.0.1:5001/eagleeyessearch/us-central1' : 'https://us-central1-eagleeyessearch.cloudfunctions.net';



// var hostURL = 'https://us-central1-aaaaggfdsfdsdaa.cloudfunctions.net';

var machineId = getMachineIdFromURL();

var globalUser = null;

var globalData = null;

var selectedLicenseId = null;

var selectedLicenseInfo = null;

console.log("Machine ID: " + machineId);

thisURLwithJustMachineIDArg = window.location.origin + '/get_licensed/?machine_id=' + machineId;

// Wait for the HTML to load
document.addEventListener("DOMContentLoaded", function () {

    const urlParams = new URLSearchParams(window.location.search);
    // Get the argument and convert it to a boolean.  It should default to true if not present.
    // var isEarlyAdopterMode = urlParams.get('early_adopter') === 'true';
    var isEarlyAdopterMode = urlParams.get('early_adopter') !== 'false';
    var paymentStatus = urlParams.get('payment');
    console.log("Payment Status:", paymentStatus); // This should output 'success' if the URL is correct


    if (paymentStatus === 'success') {
        console.log('Payment was successful.');
        $('#step2-button-container').hide();
        $('#payment-successful-message').text('Your payment was successful. Follow the steps below to unlock your Eagle Eyes Scan license on your device.').show();
        checkLicense(globalUser);
        // Add additional logic for successful payment here
    } else {
        console.log('Payment was not successful or parameter is missing.');
        // Add logic for handling other values or missing parameter here
    }
    // Display the machine ID in the HTML
    document.getElementById('machine-id').textContent = machineId;
    
    var issueKeyButton = document.getElementById('issueKeyButton');
    issueKeyButton.addEventListener('click', function() {

        getKeyForThisLicense(selectedLicenseId, globalUser);
    });
    var copyKeyButton = document.getElementById('license-key-copy-button');
    copyKeyButton.addEventListener('click', function() {

        copyTextToClipboard();
    });
});

function getMachineIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    // upper case
    return urlParams.get('machine_id').toUpperCase();
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

    $('#key-view').css('display', 'block');
    $('#license-info').val(licenseTokenToString(token));
    $('#license-key').val(code);

    // Copy the code to the clipboard
    copyTextToClipboard();
    $('#license-key-status').text("Key " + code.slice(0, 10) + '...' + " has been copied to the clipboard. You can now paste it into the Eagle Eyes app.").addClass('info-box');
    // Copy button 
    $('#license-key-copy-button').text('Copy Key to Clipboard');

    console.log("Showed new key: ", code.slice(0, 10) + '...');

    // now, you also need to re-check the license - so that it confirms that the key has been used.
    // Note that this is only really necessary if the user generated a new key but whatever
    reCheckLicense();

    // alert('New key received.  Code ' + code.slice(0, 10) + '... has been copied to the clipboard.  You can now paste it into the Eagle Eyes app.');
    // Scroll to the bottom of the page
    window.scrollTo(0, document.body.scrollHeight);
}

function getKeyForThisLicense(licenseID, user) {
    // Get the key for this license
    // First, get the user's ID token
    // We're calling the "request_token_from_license" cloud function with args machine_id and license_id
    console.log('Requesting key for license ID: ', licenseID);
    $('#issueKeyButton').addClass('non_important_button');
    // First - lets check if there is already a key for this license on this machine
    console.log('Global data: ', globalData);
    console.log('Tokens and codes: ', globalData.tokens_and_codes);
    allLicenseIdsInTokens = Object.values(globalData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
    isThereAlreadyAKey = allLicenseIdsInTokens.includes(licenseID);
    n_tokens_remaining = globalData.licenses_and_dispensed[licenseID].license.n_tokens - globalData.licenses_and_dispensed[licenseID].n_tokens_dispensed;

    // If there is not a key, warn the user that they are about to request a key and this will decrement the number of available keys
    if (!isThereAlreadyAKey) {
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

function showError(message) {


    // Show an error message to the user
    var errorBox = document.createElement('div');
    errorBox.classList.add('error-box');
    // Width 80% of the screen
    errorBox.style.width = '80%';
    // Center horizontally
    errorBox.style.margin = '0 auto';

    errorBox.textContent = message;
    // Append to end of 'end-of-page' div
    document.getElementById('end-of-page').appendChild(errorBox);

    // Show the "try again" button (try-again-button) (just make it not hidden)
    $('#try-again-button').css('display', 'block');

    // Scroll to the bottom of the page
    window.scrollTo(0, document.body.scrollHeight);
}

function checkLicense(user) {
    $('#licenses').show();
    // If user is null, use globalUser
    if (!user) {
        user = globalUser;
    }
    console.log('Checking license for user: ', user, ' with globalUser: ', globalUser);
    $('#checking-licenses-box').show();


    user.getIdToken().then(function (idToken) {
        //   var fetch_url = 'http://127.0.0.1:5001/eagleeyessearch/us-central1/check_available_licenses_and_tokens?machine_id=' + machineId;
        licenseID = $('#license-id').val();
        var fetch_url = hostURL + '/check_available_licenses_and_tokens?machine_id=' + machineId + (licenseID ? '&license_id=' + licenseID : '');
        // console.log("Fetch URL: " + fetch_url);
        console.log("Checking URL: " + fetch_url + " with ID token: " + idToken.slice(0, 10) + '...');
        $.ajax({
            url: fetch_url,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + idToken
            },
            success: onReceivingLicenseData,
            error: requestErrorHandler,
            // Finally
            complete: function () {
                console.log("complete");
                // Hide the "checking licenses" box
                $('#select-licenses').show();
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
            let errorMessage = jqXHR.responseJSON?.error || jqXHR.statusText || "Unknown error";
            // showError(`Error ${status} during license check: ${errorMessage}`);
            errorText += `Error ${status} during license check: ${errorMessage}`;
        }
    } else {
        // Handle other statuses as needed
        // showError('Unexpected error:', textStatus);
        errorText += 'Unexpected error: ' + textStatus;
    }
    errorText += "If you are connected to the internet, and the problem persists, please copy this error message and email us at info@eagleeyessearch.com.";
    // It might be a good idea to show a user-friendly error message
    // showError('An error occurred during the license check. Please try again later.');
    showError(errorText);
}

function onReceivingLicenseData(data) {
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

    console.log('Data received: ', data);
    var licenseData = JSON.parse(data); // Ensure data is parsed correctly
    globalData = licenseData; // Save for global use
    var select = document.getElementById('license-select'); // the license selector
    var textarea = document.getElementById('license-info'); // contents of license info box
    var textarea2 = document.getElementById('second-license-info-box'); // contents of license info box
    var checkingBox = document.getElementById('checking-licenses-box'); // blue info-box field
    var selectLicenseButton = document.getElementById('selectLicenseButton'); // button that selects the license

    select.innerHTML = ''; // Clear existing options

    var numberOfLicenses = Object.keys(licenseData.licenses_and_dispensed).length;

    if (numberOfLicenses > 0) {
        checkingBox.textContent = `We found ${numberOfLicenses} licence${numberOfLicenses === 1 ? '' : 's'} connected to your email address`;
        Object.keys(licenseData.licenses_and_dispensed).forEach(licenseId => {
            var license = licenseData.licenses_and_dispensed[licenseId].license;
            var option = document.createElement('option');
            option.value = licenseId;
            option.text = `${license.license_name}, exp: ${new Date(license.expiry_timestamp * 1000).toLocaleDateString()}`;
            select.appendChild(option);
        });
        select.style.display = 'block'; // Ensure the select is visible if licenses are available
        textarea.value = ''; // Clear the default message in the textarea
        selectLicenseButton.classList.remove('non-clickable');
        selectLicenseButton.disabled = false;

    } else {
        checkingBox.textContent = "No licenses connected to this account";
        select.style.display = 'none'; // Hide the select if no licenses are available
        textarea.value = ''; // Maintain consistent message in textarea
        selectLicenseButton.classList.add('non-clickable');
        selectLicenseButton.disabled = true;
    }

    select.onchange = function () {
        selectedLicenseId = this.value;
        if (!selectedLicenseId) return; // Guard against no selection 
        selectedLicense = globalData.licenses_and_dispensed[selectedLicenseId].license; // this = the select element // this.value= the selected license ID // licenseid.license is the license object that is part of the license ID
        let license_name = selectedLicense.license_name;
        let license_expiry = new Date(selectedLicense.expiry_timestamp * 1000).toLocaleDateString();
        let license_tier = selectedLicense.tier;
        let emails = selectedLicense.emails.join(', ');
        let n_tokens_dispensed = globalData.licenses_and_dispensed[this.value].n_tokens_dispensed;
        let n_tokens_remaining = (selectedLicense.n_tokens === null) ? 'Unlimited' : selectedLicense.n_tokens - n_tokens_dispensed;
        let n_tokens_total = selectedLicense.n_tokens;
        selectedLicenseInfo = `Name: ${license_name}\nExpiry: ${license_expiry}\nTier: ${license_tier}\nEmails: ${emails}\nLicense ID: ${selectedLicenseId}\nKeys Remaining: ${n_tokens_remaining} of ${n_tokens_total}`;
        textarea.value = selectedLicenseInfo;
        textarea2.value = selectedLicenseInfo;
        // var allLicenseIdsInTokens = Object.values(globalData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
        // console.log(allLicenseIdsInTokens);


    };

    // Trigger change event on load to display the first entry's details if available
    if (select.options.length > 0) {
        select.selectedIndex = 0;
        select.onchange();
    }
}


function selectLicense() {
    var selectField = document.getElementById('select-license-info');
    selectField.textContent = `License ID ${selectedLicenseId} selected`;
    var secondTextArea = document.getElementById(`second-license-info-box`);
    secondTextArea.value = selectedLicenseInfo;
    var issueKeyInfoBox = document.getElementById(`issue-key-info`);
    var code = isThereAlreadyAKey();
    console.log(code);
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
    }
    $('#select-license-info').show();
    $('#issue-key').show();
    
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

function isThereAlreadyAKey() {
    console.log('Global data: ', globalData);
    console.log('Tokens and codes: ', globalData.tokens_and_codes);
    allLicenseIdsInTokens = Object.values(globalData.tokens_and_codes).map(tokenAndCode => tokenAndCode.token.license_id);
    var keyAlreadyIssued = allLicenseIdsInTokens.includes(selectedLicenseId);
    var TokensAndCode = globalData.tokens_and_codes;
    // n_tokens_remaining = globalData.licenses_and_dispensed[licenseID].license.n_tokens - globalData.licenses_and_dispensed[licenseID].n_tokens_dispensed;
    if (keyAlreadyIssued) {
        for (let key in TokensAndCode) {
            if (TokensAndCode[key].token.license_id === selectedLicenseId) {
                $('#issueKeyButton').removeClass('non_important_button').hide();
                return TokensAndCode[key].code;  // Returns the code when the license ID matches
                console.log('there is already a key');
            }
        }
    }
    else {
        return false;
        console.log('there is no key');
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

function onClickBuy(tier) {
    console.log('Buy button clicked for tier: ' + tier);
    alert('Automated purchase of tier ' + tier + ' is not yet set up.  Please contact info@eagleeyessearch.com to purchase a license.');
}

issueKeyButton.click(function () {
    getKeyForThisLicense(select.val(), globalUser);}
);

