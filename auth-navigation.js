// Global flags for navigation state
let authCheckComplete = false;
let isAccountPage = window.location.pathname.includes('account.html');
let isCreateAccountPage = window.location.pathname.includes('create-account.html');

// Store the previous page to handle navigation properly
function storePreviousPage() {
    sessionStorage.setItem('previous_page', window.location.pathname);
}

// Get the base path for redirects
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/eagle_eyes_website_staging/')) {
        return '/eagle_eyes_website_staging/';
    }
    return '/';
}

// Initialize and handle page visibility
function initPage() {
    console.log("Initializing page UI");
    
    // Hide all sections initially except loading
    $("#page-loading").show();
    $("#signin").hide();
    
    if (isAccountPage) {
        $("#account-content").hide();
    } else if (isCreateAccountPage) {
        $("#form-container").hide();
    }
    
    // Set a timeout to ensure something is shown if auth check takes too long
    setTimeout(function() {
        if (!authCheckComplete) {
            console.log("Auth check timeout - showing signin");
            $("#page-loading").hide();
            $("#signin").show();
            
            if (isAccountPage) {
                $("#account-content").hide();
            } else if (isCreateAccountPage) {
                $("#form-container").hide();
            }
        }
    }, 3000);
    
    // Set previous page for navigation tracking
    storePreviousPage();
}

// Handle authentication state changes
function handleAuthStateChange(user) {
    if (user) {
        console.log("User signed in:", user.email);
        globalUser = user;
        
        // Continue showing loading until we check form status
        $("#page-loading").show();
        $("#signin").hide();
        
        if (isAccountPage) {
            $("#account-content").hide();
        } else if (isCreateAccountPage) {
            $("#form-container").hide();
        }
        
        // Check if user has a form and update UI
        checkUserFormStatus();
    } else {
        console.log("User is not signed in");
        globalUser = null;
        authCheckComplete = true;
        
        // Show signin, hide other sections
        $("#page-loading").hide();
        $("#signin").show();
        
        if (isAccountPage) {
            $("#account-content").hide();
        } else if (isCreateAccountPage) {
            $("#form-container").hide();
        }
    }
}

// Check if user has filled out a form
function checkUserFormStatus() {
    if (!firebase.auth().currentUser) {
        updateUIForSignedOut();
        return;
    }
    
    firebase.auth().currentUser.getIdToken(true).then(function(idToken) {
        $.ajax({
            url: hostURL + '/has_user_already_filled_in_form',
            type: 'GET',
            headers: {
                'Authorization': 'Bearer ' + idToken
            },
            success: function(data) {
                console.log("Got form status:", data);
                authCheckComplete = true;
                
                let response;
                try {
                    response = typeof data === 'string' ? JSON.parse(data) : data;
                } catch (e) {
                    console.error("Error parsing response:", e);
                    response = { form: null };
                }
                
                const hasFilledForm = response.form && Object.keys(response.form).length > 0;
                console.log("User has form:", hasFilledForm);
                
                if (hasFilledForm) {
                    // User has a form
                    if (isAccountPage) {
                        // On account page - show account content
                        $("#page-loading").hide();
                        $("#signin").hide();
                        $("#account-content").show();
                        
                        // Populate account info if function exists
                        if (typeof populateAccountInfo === 'function') {
                            populateAccountInfo(response.form);
                        }
                    } else if (isCreateAccountPage) {
                        // On create-account page - redirect to account page
                        console.log("Redirecting to account page");
                        window.location.href = getBasePath() + 'account.html';
                    }
                } else {
                    // User doesn't have a form
                    if (isAccountPage) {
                        // On account page - redirect to create-account page
                        console.log("Redirecting to create-account page");
                        window.location.href = getBasePath() + 'create-account.html';
                    } else if (isCreateAccountPage) {
                        // On create-account page - show form
                        $("#page-loading").hide();
                        $("#signin").hide();
                        $("#form-container").show();
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("Error checking form status:", textStatus, errorThrown);
                authCheckComplete = true;
                updateUIForError();
            }
        });
    }).catch(function(error) {
        console.error("Error getting ID token:", error);
        authCheckComplete = true;
        updateUIForError();
    });
}

// Update UI for error state
function updateUIForError() {
    $("#page-loading").hide();
    $("#signin").show();
    
    if (isAccountPage) {
        $("#account-content").hide();
    } else if (isCreateAccountPage) {
        $("#form-container").hide();
    }
}

// Update UI for signed out state
function updateUIForSignedOut() {
    authCheckComplete = true;
    $("#page-loading").hide();
    $("#signin").show();
    
    if (isAccountPage) {
        $("#account-content").hide();
    } else if (isCreateAccountPage) {
        $("#form-container").hide();
    }
}

// Initialize on document ready
$(document).ready(function() {
    console.log("Document ready, setting up auth handling");
    
    // Initialize UI
    initPage();
    
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
    
    // Handle back/forward navigation
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            console.log("Page loaded from cache (back/forward navigation)");
            // Re-initialize UI
            initPage();
            
            // Check current auth state
            if (firebase.auth().currentUser) {
                handleAuthStateChange(firebase.auth().currentUser);
            } else {
                updateUIForSignedOut();
            }
        }
    });
}); 