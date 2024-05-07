

function getParamFromURL(paramName, defaultValue = undefined) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName) || defaultValue;
}

function getMachineIdFromURL() {
    // // upper case
    // return urlParams.get('machine_id').toUpperCase();
    return getParamFromURL('machine_id')?.toUpperCase();
}

function getIsEmulatorFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('is_emulator') === 'true';
}


function getHostURL() {
    var useLocalFirebaseEmulator = getIsEmulatorFromURL();  // When running local emulator with "firebase emulators:start", set this to "true
    hostURL = useLocalFirebaseEmulator ? 'http://127.0.0.1:5001/eagleeyessearch/us-central1' : 'https://us-central1-eagleeyessearch.cloudfunctions.net';
    return hostURL;
}
