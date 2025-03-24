# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`
import json
import time
import traceback
from datetime import timedelta
from http import HTTPStatus
from typing import Mapping, Callable, TypeVar, Optional

import requests
# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import auth
# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn
from flask import escape
from google.cloud import storage as google_storage
from google.oauth2 import service_account

from firestore_helpers.firestore_db_functions import LicenceRequestKeys, \
    LicenseTokenAndCode, dispense_token_from_licence_and_add_to_db, lookup_matching_licenses_and_tokens_from_email, \
    get_eagle_eyes_private_key, add_license_to_database, add_signup_form_data_to_database, get_secret, \
    EAGLE_EYES_PROJECT_ID, query_form_or_none_from_user_email, UserInfo, SignupFormFieldDict, FormDataDict, \
    add_email_to_license, get_license_id_from_request, lookup_matching_licenses_and_token_from_id, \
    add_verified_user_to_database, add_newsletter_signup_to_database, \
    VerifiedUser, UserTypes, lookup_matching_licenses_and_token_with_email_and_id, send_email_to_user, \
    is_firestore_emulator, add_register_form_data_to_database, RegisterFormFieldDict, UserVerificationStatus, \
    change_user_registration_status, lookup_license_by_id, LicenceLookupError, email_token_created
from license_tokens.hashing import compute_fixed_hash, HashRep
from license_tokens.licensing import LicenseError, License, LicenseTier
import re


EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")


class RequestArgNames:
    EMAIL = 'email'
    TIER = 'tier'
    MACHINE_ID = 'machine_id'
    LICENSE_ID = 'license_id'
    LICENSE_NAME = 'license_name'
    N_TOKENS = 'n_tokens'
    EMAILS = 'emails'
    DOMAINS = 'domains'
    EXPIRY_DATE = 'expiry_date'
    EXPIRY_TIMESTAMP = 'expiry_timestamp'
    EXTRA_SECURITY_PASSWORD = 'extra_security_password'
    USER_TYPE = 'user_type'
    SAME_LICENSE_ID = 'same_license_id'


def is_preflight_request(req: https_fn.Request) -> bool:
    return req.method == 'OPTIONS'


def cors_preflight_response() -> https_fn.Response:
    headers = {
        # 'Access-Control-Allow-Origin': '*',
        # 'Access-Control-Allow-Methods': 'GET',
        # 'Access-Control-Allow-Headers': 'Authorization',
        # 'Access-Control-Max-Age': '3600'
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',  # Allow both GET and POST
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',  # Include Content-Type
        'Access-Control-Max-Age': '3600'
    }
    # return ('', HTTPStatus.NO_CONTENT, headers)
    return https_fn.Response('', status=HTTPStatus.NO_CONTENT, headers=headers)


def cors_headers() -> Mapping[str, str]:
    return {'Access-Control-Allow-Origin': '*'}


ArgType = TypeVar('ArgType')


class NoDefault:
    pass


def get_param_from_request(
        req: https_fn.Request,
        param_name: str,
        converter: Callable[[str], ArgType] = lambda x: x,
        value_if_missing: ArgType = NoDefault
) -> ArgType:
    param_str = req.args.get(param_name)
    if param_str is None:
        if value_if_missing is not NoDefault:
            return value_if_missing
        else:
            raise KeyError(f"Parameter {param_name} not provided.")
    try:
        return converter(param_str)
    except Exception as e:
        print(f"Error converting {param_name} to {converter}: {e}")
        raise ValueError(f"Error converting {param_name} to {converter}: {e}")


def get_service_account_email():
    """
    Fetches the service account email of the Cloud Function from the metadata server.
    """
    url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
    headers = {"Metadata-Flavor": "Google"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.text
    else:
        return "Unable to retrieve service account email."


def get_machine_id_from_request(req: https_fn.Request) -> str:
    return get_param_from_request(req, LicenceRequestKeys.MACHINE_ID)


def get_license_id_from_request(req: https_fn.Request) -> str:
    return get_param_from_request(req, LicenceRequestKeys.LICENSE_ID)


class UserAuthenticationError(Exception):
    pass


def get_user_authenticated_user_info_from_request(req: https_fn.Request) -> UserInfo:
    """
    This function takes a request and returns the email of the authenticated user.
    It will raise a UserAuthenticationError if the user is not authenticated.
    Or some other Exception if there's a problem with the request.
    """
    authorization = req.headers.get('Authorization')
    if authorization is None:
        raise UserAuthenticationError("No Authorization header provided.")
    else:
        id_token = authorization.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(id_token)
        return {
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name', ''),  # Default to an empty string if 'name' is not available
            'uid': decoded_token.get('uid'),
            **decoded_token
        }

@https_fn.on_request()
def check_available_licenses_and_tokens(req: https_fn.Request) -> https_fn.Response:
    """
    This function looks up all licenses and tokens associated with a given email, license ID, and machine_ID.

    It will return all licenses associated with the email OR the license_id
    And all tokens associated with the email AND the machine_id

    Request Args:
    - machine_id: - the machine_id of the machine requesting the token
    - email: - the email of the user requesting the token (accessed via the Authorization header)
    - license_id (Optional): - the license_id of the license for which the token is being requested

    Returns a response containing a json object corresponding to a
        <result: LicenseQueryResult>:  # The result object
            tokens_and_codes: Mapping[str, LicenseTokenAndCode]   # Contains all license tokens matching email AND machine_id
                <token_id: str>: <LicenseTokenAndCode>
                    token: LicenseToken
                        tier: str
                        expiry_timestamp: float
                        email: str
                        license_id: str
                        machine_id: Optional[str]
                        license_name: Optional[str]
                        code: str  # Some code, which can be used to decrypt things like model files
                    code: str  # The code representing the token
            licenses_and_dispensed: Mapping[str, LicenseAndSlots]  # Contains all licenses matching email OR license_id
                <license_id: str>: <LicenseAndSlots>
                    license: License
                        tier: str
                        expiry_timestamp: float
                        emails: List[str]  # All emails associated with this license
                        domains: List[str]
                        license_name: str
                        n_tokens: int
                    n_tokens_dispensed: int  # Total number of tokens dispensed from this license

    Call this with, e.g.
        http://127.0.0.1:5001/eagleeyessearch/us-central1/checklicence?email=testuser%40test.com&machine_id=123456
    """
    headers = cors_headers()

    if req.path == '/__/health':
        print("Received a health check request, returning OK.")
        return https_fn.Response("OK", status=HTTPStatus.OK, headers=headers)

    # As a test, return a sucess immeidately

    try:
        print("------------------------check_available_licenses_and_tokens-------------------------------------")
        print(f"Got request: {req}.  Is preflight: {is_preflight_request(req)}, Request method: {req.method}")
        print(f"Request args: {req.args}")
        # Set CORS headers for the preflight request
        if is_preflight_request(req):
            return cors_preflight_response()

        # Set CORS headers for the main request

        # Comment in to check fhe state of the entire database
        # full_db = load_entire_database()
        # print(f"Full database: {full_db.summary()}")

        machine_id = get_machine_id_from_request(req)
        user_email = get_user_authenticated_user_info_from_request(req)['email']
        license_id: Optional[str] = get_param_from_request(req, param_name=RequestArgNames.LICENSE_ID, converter=lambda x: (x.strip()) or None, value_if_missing=None)

        print(f"Looing up matching licenses and tokens for email: {user_email}, machine_id: {machine_id}, license_id: {license_id}")
        licences_and_tokens = lookup_matching_licenses_and_token_with_email_and_id(
            user_email=user_email,
            license_id=license_id,
            machine_id=machine_id,
            after_timestamp=time.time(),
            private_key=get_eagle_eyes_private_key()
        )
        print('...' + licences_and_tokens.summary())

        combined_json_object = licences_and_tokens.to_json_dict()

        json_string = json.dumps(combined_json_object)
        print(f"Responding with: \n{json_string}")
        return https_fn.Response(json_string, status=HTTPStatus.OK, headers=headers)
    except Exception as err:
        print(traceback.format_exc())
        return https_fn.Response(f"Error: {err}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


class NoMoreTokensError(LicenseError):
    pass


@https_fn.on_request()
def request_token_from_license(req: https_fn.Request) -> https_fn.Response:
    """
    This function takes a machine_id, an email, and a license_id, and returns a new token for that license.
    The token is added to the database and returned along with a signed code.

    Internal steps:
    - Extract license_id, machine_id, and user_email (and user name) from the request.
    - Look up the license by license_id.
    - If the license is not found, return a 404.
    - If the license is non-public, update the license record to add the user's email (without sending the "new license" email).
    - Dispense a new token and add it to the database.
    - Send a "new token" email to notify the primary contact using the NEW_TOKEN_EMAIL_TEMPLATE,
      where the email body includes the token creator's user name.
    """
    print(f"Got token request: {req}. Is preflight: {is_preflight_request(req)}, Request method: {req.method}")
    headers = cors_headers()

    if req.path == '/__/health':
        print("Received a health check request, returning OK.")
        return https_fn.Response("OK", status=HTTPStatus.OK, headers=headers)

    if is_preflight_request(req):
        return cors_preflight_response()

    try:
        # Extract parameters from the request.
        licence_id = get_license_id_from_request(req)
        machine_id = get_machine_id_from_request(req)
        auth_info = get_user_authenticated_user_info_from_request(req)
        user_email = auth_info['email']
        # Get the user's name; if not available, fall back to using the part before the '@'
        user_name = auth_info.get('name', user_email.split('@')[0])

        # Look up the license to check its existence and public status.
        license_obj = lookup_license_by_id(licence_id)
        if license_obj is None:
            error_msg = f"License with ID {licence_id} not found."
            print(error_msg)
            return https_fn.Response(error_msg, status=HTTPStatus.NOT_FOUND, headers=headers)

        if not license_obj.is_public:
            # For non-public licenses, add the user's email to the license.
            # (The updated add_email_to_license will suppress the license notification email by using notify_people=False.)
            add_email_to_license(licence_id, user_email)
        else:
            # For public licenses, we do not modify the license record.
            print(f"License {licence_id} is public; not adding {user_email} to the license record.")

        # Dispense the token and add it to the database.
        token_and_code: LicenseTokenAndCode = dispense_token_from_licence_and_add_to_db(
            email=user_email, machine_id=machine_id, license_id=licence_id
        )

        # Send the token creation email.
        # Now pass the user's name (from Firebase) to email_token_created.
        email_token_created(license_obj, token_and_code, user_name=user_name)

        response_json = token_and_code.to_json_dict()
        print(f"Responding to token-request with: \n{response_json}")
        return https_fn.Response(json.dumps(response_json), status=HTTPStatus.OK, headers=headers)

    except Exception as err:
        print(traceback.format_exc())
        return https_fn.Response(str(err), status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)

def is_admin(email) -> bool:
    """ Is the user with this id token an admin?
    You of course need to make sure the email is verified
    """
    # decoded_token = auth.verify_id_token(id_token)
    # return decoded_token.get('admin') is True
    return email in ['peter.ed.oconnor@gmail.com', 'joep@eagleeyessearch.com', 'peter@eagleeyessearch.com', 'patrick@eagleeyessearch.com']


def verify_admin(email: str):
    """ Verifies that the user associated with the provided ID token has admin privileges. """
    if not is_admin(email):
        raise PermissionError("User does not have admin privileges.")


@https_fn.on_request()
def is_logged_in_user_admin(req: https_fn.Request) -> https_fn.Response:
    """
    Check if the logged in user is an admin.

    Example request:
        http://localhost:5001/project-id/us-central1/isLoggedInUserAdmin
    """
    headers = cors_headers()

    if is_preflight_request(req):
        return cors_preflight_response()

    try:
        # Extract the ID token from the Authorization header
        id_token = req.headers.get('Authorization').split('Bearer ')[1]
        email_for_user = auth.verify_id_token(id_token).get('email')
        is_admin_user = is_admin(email_for_user)
        print(f"Got Admin access request for: {email_for_user}.  Responding with: {is_admin_user}")
        return https_fn.Response(json.dumps({'is_admin': is_admin_user}), status=HTTPStatus.OK, headers=headers)
    except Exception as e:
        return https_fn.Response(str(e), status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


def is_valid_email(email: str) -> bool:
    return '@' in email and '.' in email.split('@')[-1]


def handle_json_infinity(obj):
    """ Replace infinity with None """
    if isinstance(obj, float) and obj == float('inf'):
        return None
    elif isinstance(obj, dict):
        return {key: handle_json_infinity(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [handle_json_infinity(item) for item in obj]
    else:
        return obj


@https_fn.on_request()
def add_new_license(request: https_fn.Request) -> https_fn.Response:
    """
    HTTP request handler for adding a new license to the Firestore database.
    Verifies that the requester is an admin before proceeding.

    :param request: The Flask request object containing the license data and the user's ID token.
        Should contain fields:
            license_name: A name to call it, e.g. "A-team trial license"
            emails: comma-separated emails assigned to license
            domains: comma-separated domains assigned
            expiry_date, e.g. 2024-07-01
            n_tokens: Number of tokens that can be dispensed from this license (e.g. 3)
            tier: License tier - e.g. basic, sar
            license_id: Optionally, the license id - which you may use to update an existing license
    :return: A Flask response object
    """

    print("Got request to add new license")
    if is_preflight_request(request):
        return cors_preflight_response()

    try:
        # Extract the ID token from the Authorization header
        id_token = request.headers.get('Authorization').split('Bearer ')[1]
        verified_email = auth.verify_id_token(id_token).get('email')

        print(f"Got request to add new license from: {verified_email} ")
        print(f"  Args: {request.args} ")

        # Verify the user is an admin
        verify_admin(verified_email)

        request_json = request.get_json()
        print(f"  Request JSON: {request_json}")

        # Assuming request is a JSON containing license_name, emails, domains, expiry_date
        extra_security_password = request_json[RequestArgNames.EXTRA_SECURITY_PASSWORD]
        request_json = request.get_json()
        if compute_fixed_hash(extra_security_password, salt='itssaltyinhere', hashrep=HashRep.BASE_32) != 'FWUZRO334L7IDTZNH4TKCAUAHQ':
            raise PermissionError("Extra security password is incorrect.")
        # license_name = get_param_from_request(request_json, RequestArgNames.LICENSE_NAME)
        license_name = request_json[RequestArgNames.LICENSE_NAME]
        emails = [e.strip() for e in request_json[RequestArgNames.EMAILS] if e]
        for e in emails:
            assert is_valid_email(e), f"Improperly formatted email: {e}"
        # domains = get_param_from_request(request_json, RequestArgNames.DOMAINS, converter=lambda x: x.split(','))
        domains = [d.strip() for d in request_json[RequestArgNames.DOMAINS] if d]
        for d in domains:
            assert '.' in d, f"Improperly formatted domain: {d}"

        expiry_timestamp = request_json[RequestArgNames.EXPIRY_TIMESTAMP] or float('inf')
        n_tokens = int(request_json[RequestArgNames.N_TOKENS])
        license_id = request_json.get(RequestArgNames.LICENSE_ID, None)
        tier = request_json[RequestArgNames.TIER]
        same_license_id = request_json[RequestArgNames.SAME_LICENSE_ID]
        # user_type_str = request_json[RequestArgNames.USER_TYPE]

        for email in emails:
            change_user_registration_status(
                email=email,
                status=UserVerificationStatus.APPROVED,
                approver_email=verified_email,
                send_approval_emails=tier is None  # Only send approval emails if we are not adding a license (in which case we will send the license email)
            )
        result = {}
        if tier is not None:  # If we are actually adding a license
            assert tier in LicenseTier.get_all(), f"Invalid license tier: {tier}: not in {LicenseTier.get_all()}.  This is case sensitive"

            if same_license_id:
                license_result = process_new_license(license_name, emails, domains, expiry_timestamp, tier, n_tokens, license_id)
                result[license_result['license_id']] = license_result
            else:
                for email in emails:
                    license_result = process_new_license(license_name, [email], domains, expiry_timestamp, tier, n_tokens, license_id)
                    result[license_result['license_id']] = license_result
        else:
            result = dict(
                license_id=license_id,
                new_license=None,
                users_added=emails,
            )
        print(f"Returning result: {result}")
        return https_fn.Response(json.dumps(result), status=HTTPStatus.OK, headers=cors_headers())
    except KeyError as e:
        print(f"Missing data in request: {e}")
        print(traceback.format_exc())
        # return "Missing data in request", 400
        return https_fn.Response(f"Missing data in request: {e}", status=HTTPStatus.BAD_REQUEST, headers=cors_headers())
    except PermissionError as e:
        print(f"Permission error: {e}")
        print(traceback.format_exc())
        # return str(e), 403
        return https_fn.Response(str(e), status=HTTPStatus.FORBIDDEN, headers=cors_headers())
    except Exception as e:
        print(f"Error adding new license: {e}")
        print(traceback.format_exc())
        return https_fn.Response(str(e), status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=cors_headers())


def process_new_license(license_name, emails, domains, expiry_timestamp, tier, n_tokens, license_id):
    """
    Creates license objects and adds them to the database
    """
    new_license = License(
        license_name=license_name,
        emails=emails,
        domains=domains,
        expiry_timestamp=float(expiry_timestamp),
        tier=tier,
        n_tokens=n_tokens
    )
    license_id = add_license_to_database(new_license, document_id=license_id, notify_people=not is_firestore_emulator())
    new_license_json_dict = handle_json_infinity(new_license.to_json_dict())
    print(f'New license {new_license_json_dict}')
    return {
        'license_id': license_id,
        'new_license': new_license_json_dict,
        'users_added': emails
    }


def get_service_account_credentials() -> service_account.Credentials:
    """
    Retrieves service account credentials from Secret Manager.
    """
    secret_json = get_secret('eagle_eyes_service_account_key')
    return service_account.Credentials.from_service_account_info(json.loads(secret_json))


@https_fn.on_request()
def generate_download_link(req: https_fn.Request) -> https_fn.Response:
    """
    Generate a signed URL for downloading a file from Firebase Storage.

    Example request:
        http://localhost:5001/project-id/us-central1/generateDownloadLink?filePath=path/to/file
    """
    print("Got request for `download link")

    if is_preflight_request(req):
        return cors_preflight_response()

    headers = cors_headers()

    try:

        form_data = req.get_json()
        print(f"Got form data: {form_data}")
        user_info = get_user_authenticated_user_info_from_request(req)
        user_email_or_none = user_info.get('email', None)
        print(f"... from User info: {user_email_or_none}")

        if form_data is None:
            print(f"Form data is None - that's fine if user has already filled in form.  User email: {user_email_or_none}")
            # This should happen when user has already filled in form - so website doesn't ask it
            assert user_email_or_none is not None, "No form data and no user email provided."
            previously_entered_form_data_or_none = query_form_or_none_from_user_email(user_email_or_none)
            if previously_entered_form_data_or_none is None:
                print("WARNING: This user did not submit a form - and we don't have a record of a past form... That is strange")

        else:
            form_data: FormDataDict  # At least that's the expectation
            submitted_data: SignupFormFieldDict = dict(
                user_info=user_info,
                form_data=form_data
            )
            print(f"Got form data: {submitted_data}")
            add_signup_form_data_to_database(submitted_data)

        # Use the modified part here to set up credentials
        # Assume 'my-service-account-secret' is the ID of your secret where the service account JSON is stored
        # And 'my-project-id' is your Google Cloud project ID
        credentials = get_service_account_credentials()
        # credentials = get_secret('eagle_eyes_service_account_key')
        # Explicitly set the credentials for the storage client
        storage_client = google_storage.Client(credentials=credentials, project=EAGLE_EYES_PROJECT_ID)
        bucket = storage_client.bucket("eagleeyessearch.appspot.com")

        # Extract file path from query parameters
        file_path = req.args.get('filePath')
        if not file_path:
            return https_fn.Response("File path is required", status=HTTPStatus.BAD_REQUEST, headers=headers)

        # Ensure the path is properly escaped to prevent injection issues
        file_path = escape(file_path)

        # Create a blob for the file path
        print(f"Getting blob for file path: {file_path}")
        blob = bucket.blob(file_path)

        # Generate a signed URL for the blob
        print("Generating signed URL...")
        url = blob.generate_signed_url(expiration=timedelta(minutes=15), version="v4")

        print(f"Responding with url: {url}")
        # Respond with the signed URL
        return https_fn.Response(json.dumps({"url": url}), status=HTTPStatus.OK, headers=headers)

    except Exception as e:
        print(f"Error generating signed URL: {str(e)}")
        return https_fn.Response(f"Error: {str(e)}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


@https_fn.on_request()
def submit_register_form(req: https_fn.Request) -> https_fn.Response:
    """
    Submits the register form to the database.
    Lets the client know if the form is submitted successfully.

    Example request:
        http://localhost:5001/project-id/us-central1/submit_register_form
    """
    print("Got request to submit form")

    if is_preflight_request(req):
        return cors_preflight_response()

    headers = cors_headers()

    try:

        form_data = req.get_json()
        print(f"Got form data: {form_data}")
        user_info = get_user_authenticated_user_info_from_request(req)
        user_email_or_none = user_info.get('email', None)
        print(f"... from User info: {user_email_or_none}")

        if form_data is None:
            print(f"Form data is None - that's fine if user has already filled in form.  User email: {user_email_or_none}")
            # This should happen when user has already filled in form - so website doesn't ask it
            assert user_email_or_none is not None, "No form data and no user email provided."
            # previously_entered_form_data_or_none = query_form_or_none_from_user_email(user_email_or_none)
            # if previously_entered_form_data_or_none is None:
            #     print("WARNING: This user did not submit a form - and we don't have a record of a past form... That is strange")

        else:
            form_data: FormDataDict  # At least that's the expectation
            submitted_data: RegisterFormFieldDict = dict(
                user_info=user_info,
                form_data=form_data,
                user_status=UserVerificationStatus.PENDING
            )
            print(f"Got form data: {submitted_data}")
            add_register_form_data_to_database(submitted_data)
            add_signup_form_data_to_database(submitted_data)

        # Use the modified part here to set up credentials
        # Assume 'my-service-account-secret' is the ID of your secret where the service account JSON is stored
        # And 'my-project-id' is your Google Cloud project ID
        # credentials = get_service_account_credentials()
        # credentials = get_secret('eagle_eyes_service_account_key')
        # Explicitly set the credentials for the storage client
        # storage_client = google_storage.Client(credentials=credentials, project=EAGLE_EYES_PROJECT_ID)
        # bucket = storage_client.bucket("eagleeyessearch.appspot.com")

        # Extract file path from query parameters
        # file_path = req.args.get('filePath')
        # if not file_path:
        #     return https_fn.Response("File path is required", status=HTTPStatus.BAD_REQUEST, headers=headers)

        # Ensure the path is properly escaped to prevent injection issues
        # file_path = escape(file_path)

        # Create a blob for the file path
        # print(f"Getting blob for file path: {file_path}")
        # blob = bucket.blob(file_path)

        # Generate a signed URL for the blob
        # print("Generating signed URL...")
        # url = blob.generate_signed_url(expiration=timedelta(minutes=15), version="v4")
        #
        # print(f"Responding with url: {url}")
        # # Respond with the signed URL

        # # Respond with OK message
        return https_fn.Response(status=HTTPStatus.OK, headers=headers)

    except Exception as e:
        print(f"There was an error: {str(e)}")
        return https_fn.Response(f"Error: {str(e)}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


@https_fn.on_request()
def get_response_for_testing():
    """ Mininmal function that just response with a simple message, verifying that the server is up and running. """

    return https_fn.Response("Server is up and running!", status=HTTPStatus.OK, headers=cors_headers())


@https_fn.on_request()
def has_user_already_filled_in_form(req: https_fn.Request) -> https_fn.Response:
    """
    Check if a user has already filled in the form with the given email.

    Example request:
        http://localhost:5001/project-id/us-central1/hasUserAlreadyFilledInForm?email=test%40test.com
    """
    print("Got request for `has_user_already_filled_in_form")

    if is_preflight_request(req):
        return cors_preflight_response()

    headers = cors_headers()

    try:
        # email = get_param_from_request(req, RequestArgNames.EMAIL)
        # No get email from the header
        user_info = get_user_authenticated_user_info_from_request(req)
        email = user_info['email']
        print(f"Checking if user has already filled in form with email: {email}")
        form = query_form_or_none_from_user_email(email)
        backupLink = "https://docs.google.com/document/d/19nqxhhtOQbT2_TpAcMeTqFMcgbMAOf6aCzWm-XXV-Dc/edit?usp=sharing"
        print(f"Responding with form: {form}")
        return https_fn.Response(json.dumps({"form": form, "backupLink": backupLink}), status=HTTPStatus.OK, headers=headers)

    except Exception as e:
        print(f"Error checking if user has already filled in form: {str(e)}")
        return https_fn.Response(f"Error: {str(e)}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


LICENSE_CREATION_FAILED_TEMPLATE = """
Dear Eagle Eyes Team, 

User {user_email} has purchased License {license_id} but the license creation failed.  
Please fix the situation ASAP.

- Eagle Eyes Licensing System
"""


@https_fn.on_request()
def confirm_license_in_database(req: https_fn.Request) -> https_fn.Response:
    """
    Confirm that the provided license ID is now in the databse.
    - If it is, just sen a confirmation message with a success status.
    - If it isn't, send an email to both the user and info@eagleeyessearch.com
      and return a message saying that there's been an error.
    """

    print("Got request to check if license is in database")

    if is_preflight_request(req):
        return cors_preflight_response()

    headers = cors_headers()

    license_id = user_email = None  # Shouldn't matter - but technially should be here to avoid errors.
    try:
        license_id = get_license_id_from_request(req)
        user_email = get_param_from_request(req, param_name=LicenceRequestKeys.EMAIL, value_if_missing=None)
        print(f"Checking if license is in database with ID: {license_id}")
        license = lookup_license_by_id(license_id)
        print(f"Responding with license: {license}")
        return https_fn.Response(f"License {license_id} verified - it's in our database.", status=HTTPStatus.OK, headers=headers)
    except LicenceLookupError as e:  # License not found
        print(f"License not found in database: {str(e)}")
        if not is_firestore_emulator():
            print(f"Emailing user {user_email} about this failure to create license {license_id}")
            send_email_to_user(
                email="info@eagleeyessearch.com",
                subject=f"License creation failed for license {license_id}",
                cc=user_email,
                body=LICENSE_CREATION_FAILED_TEMPLATE.format(user_email=user_email, license_id=license_id),
            )
        return https_fn.Response(f"License {license_id} not found.  This should not happen!  We've sent an email to info@eagleeyessearch.com and {user_email} and will work on rectifying the situation ASAP.", status=HTTPStatus.NOT_FOUND, headers=headers)
    except Exception as e:
        print(f"Error checking if license is in database: {str(e)}")
        return https_fn.Response(f"Error: {str(e)}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


@https_fn.on_request()
def newsletter_signup(req: https_fn.Request) -> https_fn.Response:
    """
    Handles newsletter signup requests.

    Expected JSON payload:
      {
         "email": "user@example.com",
         "honeypot": ""  // Hidden field; must be empty
      }

    Validates the email format and that the honeypot field is empty.
    If valid, it calls add_newsletter_signup_to_database() to add the email to Firestore.
    Returns a success response if added or an error message otherwise.
    """
    print("newsletter_signup function triggered")
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    # Handle preflight requests
    if req.method == 'OPTIONS':
        return https_fn.Response('', status=HTTPStatus.NO_CONTENT, headers=headers)

    try:
        data = req.get_json(silent=True)
        if not data:
            return https_fn.Response("No data provided", status=HTTPStatus.BAD_REQUEST, headers=headers)

        email = data.get('email', '').strip()
        honeypot = data.get('honeypot', '').strip()

        # If the honeypot field is filled, likely a bot is calling this function.
        if honeypot:
            return https_fn.Response("Bad Request", status=HTTPStatus.BAD_REQUEST, headers=headers)

        # Validate the email format
        if not email or not EMAIL_REGEX.match(email):
            return https_fn.Response("Invalid email", status=HTTPStatus.BAD_REQUEST, headers=headers)

        # Call the separate function to add the email to the database.
        add_newsletter_signup_to_database(email)

        return https_fn.Response("Signup successful", status=HTTPStatus.OK, headers=headers)
    except Exception as e:
        print(f"Error in newsletter_signup: {e}")
        return https_fn.Response(f"Error: {str(e)}", status=HTTPStatus.INTERNAL_SERVER_ERROR, headers=headers)


@https_fn.on_request()
def list_files(req: https_fn.Request) -> https_fn.Response:
    """
    List files in a specified directory in Firebase Storage.

    Args:
        req: The request object containing:
            - directory: The directory to list files from
            - Authorization header with Firebase ID token

    Returns:
        https_fn.Response: Response containing list of files with metadata
    """
    print("Got request to list files")

    if is_preflight_request(req):
        return cors_preflight_response()

    headers = cors_headers()

    try:
        # Get and verify user authentication using your existing function
        user_info = get_user_authenticated_user_info_from_request(req)
        user_email = user_info['email']

        # Validate directory parameter
        directory = req.args.get('directory')
        if not directory:
            return https_fn.Response(
                "Directory is required",
                status=HTTPStatus.BAD_REQUEST,
                headers=headers
            )

        # Validate directory path to prevent directory traversal
        if '..' in directory or directory.startswith('/'):
            return https_fn.Response(
                "Invalid directory path",
                status=HTTPStatus.BAD_REQUEST,
                headers=headers
            )

        # Only allow specific directories
        allowed_directories = ['pilot-releases/current', 'scan_releases/current']
        if directory not in allowed_directories:
            return https_fn.Response(
                "Unauthorized directory",
                status=HTTPStatus.FORBIDDEN,
                headers=headers
            )

        # Get storage client using your existing credentials function
        credentials = get_service_account_credentials()
        storage_client = google_storage.Client(
            credentials=credentials,
            project=EAGLE_EYES_PROJECT_ID
        )
        bucket = storage_client.bucket("eagleeyessearch.appspot.com")

        # List files in the directory
        blobs = bucket.list_blobs(prefix=directory)

        # Extract file information
        files = []
        for blob in blobs:
            # Skip the directory itself
            if blob.name == directory:
                continue

            # Get file metadata
            metadata = blob.metadata or {}

            files.append({
                'name': blob.name.split('/')[-1],  # Get just the filename
                'size': blob.size,
                'updated': blob.updated.isoformat(),
                'contentType': blob.content_type,
                'version': metadata.get('version', ''),
                'platform': metadata.get('platform', '')
            })

        print(f"Found {len(files)} files in directory {directory}")
        return https_fn.Response(
            json.dumps({'files': files}),
            status=HTTPStatus.OK,
            headers=headers
        )

    except UserAuthenticationError as e:
        print(f"Authentication error: {str(e)}")
        return https_fn.Response(
            str(e),
            status=HTTPStatus.UNAUTHORIZED,
            headers=headers
        )
    except Exception as e:
        print(f"Error listing files: {str(e)}")
        print(traceback.format_exc())
        return https_fn.Response(
            "An error occurred",
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            headers=headers
        )