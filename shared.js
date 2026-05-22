

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

// Mirrors the backend validator (normalize_machine_id in
// functions/licensing/firestore_helpers/request_handlers.py). Any change here
// MUST stay in sync with the server, or the user sees a 400 they could have
// been stopped from causing.
const MACHINE_ID_SENTINELS = new Set([
    'NONE', 'NULL', 'UNDEFINED', 'NIL',
    'TEST', 'FAKE', 'PLACEHOLDER',
    '(NONE PROVIDED)', '*',
]);

function isRealMachineId(value) {
    if (!value) return false;
    const v = String(value).trim().toUpperCase();
    if (v.length < 8 || v.length > 64) return false;
    if (!/^[A-Z0-9]+$/.test(v)) return false;
    if (MACHINE_ID_SENTINELS.has(v)) return false;
    // All-same-char strings (e.g. AAAAAAAA, 00000000)
    if (/^(.)\1+$/.test(v)) return false;
    return true;
}

// App-agnostic — users may arrive here from either Eagle Eyes Scan (desktop)
// or Eagle Eyes Pilot (mobile), so don't reference any specific UI element.
const MACHINE_ID_INSTRUCTION = "Return to the Eagle Eyes app on the device you want to license and start the licensing flow from there — the app will open this page with your Machine ID filled in. Or use the \"Change\" button above to paste one in.";
